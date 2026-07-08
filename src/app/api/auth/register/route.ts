import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { registerStudentSchema, registerTeacherSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const role = raw.role === "alumno" ? "STUDENT" : "TEACHER";

    const existing = await prisma.user.findUnique({ where: { email: String(raw.email ?? "").toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
    }

    let user;
    if (role === "STUDENT") {
      const data = registerStudentSchema.parse(raw);
      const existingId = await prisma.user.findUnique({ where: { institutionId: data.institutionId } });
      if (existingId) {
        return NextResponse.json({ error: "Ese ID de institución ya está registrado" }, { status: 409 });
      }
      const passwordHash = await bcrypt.hash(data.password, 10);
      const email = data.email.toLowerCase();
      user = await prisma.user.create({
        data: {
          role: "STUDENT",
          name: data.name,
          email,
          passwordHash,
          institutionId: data.institutionId,
        },
      });

      const pendingInvites = await prisma.invitation.findMany({
        where: { email, claimedAt: null },
      });
      if (pendingInvites.length > 0) {
        await prisma.$transaction([
          ...pendingInvites.map((inv) =>
            prisma.enrollment.upsert({
              where: { subjectId_studentId: { subjectId: inv.subjectId, studentId: user!.id } },
              update: { active: true },
              create: { subjectId: inv.subjectId, studentId: user!.id },
            }),
          ),
          prisma.invitation.updateMany({
            where: { id: { in: pendingInvites.map((i) => i.id) } },
            data: { claimedAt: new Date(), claimedByStudentId: user.id },
          }),
        ]);
      }
    } else {
      const data = registerTeacherSchema.parse(raw);
      const passwordHash = await bcrypt.hash(data.password, 10);
      user = await prisma.user.create({
        data: {
          role: "TEACHER",
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
        },
      });
    }

    await createSession({ sub: user.id, role: user.role });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    return errorResponse(err);
  }
}
