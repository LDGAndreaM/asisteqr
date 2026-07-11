import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const role = body.role === "alumno" ? "STUDENT" : "TEACHER";

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || user.role !== role) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Esta cuenta usa inicio de sesión con Google. Usa el botón “Continuar con Google”." },
        { status: 401 },
      );
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    if (role === "STUDENT") {
      if (!body.institutionId || body.institutionId !== user.institutionId) {
        return NextResponse.json(
          { error: "El ID de la institución no coincide con tu cuenta" },
          { status: 401 },
        );
      }
    }

    await createSession({ sub: user.id, role: user.role });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
