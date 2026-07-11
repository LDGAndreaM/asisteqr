import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { PENDING_STUDENT_COOKIE, verifyPendingStudent } from "@/lib/google-auth";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({ institutionId: z.string().trim().min(3, "ID de institución inválido") });

export async function POST(req: NextRequest) {
  try {
    const { institutionId } = bodySchema.parse(await req.json());

    const store = await cookies();
    const token = store.get(PENDING_STUDENT_COOKIE)?.value;
    const pending = token ? await verifyPendingStudent(token) : null;
    if (!pending) {
      return NextResponse.json({ error: "Tu sesión de Google expiró, intenta de nuevo" }, { status: 401 });
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email: pending.email } });
    if (existingByEmail) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
    }
    const existingById = await prisma.user.findUnique({ where: { institutionId } });
    if (existingById) {
      return NextResponse.json({ error: "Ese ID de institución ya está registrado" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        role: "STUDENT",
        name: pending.name,
        email: pending.email,
        passwordHash: null,
        institutionId,
      },
    });

    const pendingInvites = await prisma.invitation.findMany({
      where: { email: pending.email, claimedAt: null },
    });
    if (pendingInvites.length > 0) {
      await prisma.$transaction([
        ...pendingInvites.map((inv) =>
          prisma.enrollment.upsert({
            where: { subjectId_studentId: { subjectId: inv.subjectId, studentId: user.id } },
            update: { active: true },
            create: { subjectId: inv.subjectId, studentId: user.id },
          }),
        ),
        prisma.invitation.updateMany({
          where: { id: { in: pendingInvites.map((i) => i.id) } },
          data: { claimedAt: new Date(), claimedByStudentId: user.id },
        }),
      ]);
    }

    store.delete(PENDING_STUDENT_COOKIE);
    await createSession({ sub: user.id, role: "STUDENT" });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    return errorResponse(err);
  }
}
