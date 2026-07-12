import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import {
  verifyFirebaseIdToken,
  signPendingStudent,
  PENDING_STUDENT_COOKIE,
  PENDING_STUDENT_TTL_SECONDS,
} from "@/lib/google-auth";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  idToken: z.string().min(1),
  role: z.enum(["maestro", "alumno"]),
});

export async function POST(req: NextRequest) {
  try {
    const { idToken, role } = bodySchema.parse(await req.json());
    const profile = await verifyFirebaseIdToken(idToken);
    const expectedRole = role === "alumno" ? "STUDENT" : "TEACHER";

    const existing = await prisma.user.findUnique({ where: { email: profile.email } });

    if (existing) {
      if (existing.role !== expectedRole) {
        return NextResponse.json(
          {
            error: `Ese correo de Google ya está registrado como ${
              existing.role === "TEACHER" ? "maestro" : "alumno"
            }`,
          },
          { status: 409 },
        );
      }
      await createSession({ sub: existing.id, role: existing.role });
      return NextResponse.json({ status: "ok", role: existing.role });
    }

    if (expectedRole === "TEACHER") {
      const user = await prisma.user.create({
        data: { role: "TEACHER", name: profile.name, email: profile.email, passwordHash: null },
      });
      await createSession({ sub: user.id, role: "TEACHER" });
      return NextResponse.json({ status: "ok", role: "TEACHER" });
    }

    // Alumno nuevo: todavía necesitamos su ID de institución antes de crear la cuenta.
    const pendingToken = await signPendingStudent(profile);
    const store = await cookies();
    store.set(PENDING_STUDENT_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_STUDENT_TTL_SECONDS,
    });

    return NextResponse.json({ status: "needs_registration" });
  } catch (err) {
    return errorResponse(err);
  }
}
