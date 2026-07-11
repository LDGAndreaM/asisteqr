import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import {
  exchangeCodeForIdToken,
  verifyGoogleIdToken,
  verifyOAuthState,
  signPendingStudent,
  PENDING_STUDENT_COOKIE,
  PENDING_STUDENT_TTL_SECONDS,
} from "@/lib/google-auth";

function loginError(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const stateToken = req.nextUrl.searchParams.get("state");

  if (!code || !stateToken) {
    return loginError(origin, "Faltan datos en la respuesta de Google");
  }

  const state = await verifyOAuthState(stateToken);
  if (!state) {
    return loginError(origin, "Tu sesión de Google expiró, intenta de nuevo");
  }

  let profile;
  try {
    const redirectUri = new URL("/api/auth/google/callback", origin).toString();
    const idToken = await exchangeCodeForIdToken(code, redirectUri);
    profile = await verifyGoogleIdToken(idToken);
  } catch {
    return loginError(origin, "No se pudo verificar tu cuenta de Google");
  }

  const expectedRole = state.role === "alumno" ? "STUDENT" : "TEACHER";
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existing) {
    if (existing.role !== expectedRole) {
      return loginError(
        origin,
        `Ese correo de Google ya está registrado como ${existing.role === "TEACHER" ? "maestro" : "alumno"}`,
      );
    }
    await createSession({ sub: existing.id, role: existing.role });
    return NextResponse.redirect(new URL(existing.role === "TEACHER" ? "/teacher" : "/student", origin));
  }

  if (expectedRole === "TEACHER") {
    const user = await prisma.user.create({
      data: { role: "TEACHER", name: profile.name, email: profile.email, passwordHash: null },
    });
    await createSession({ sub: user.id, role: "TEACHER" });
    return NextResponse.redirect(new URL("/teacher", origin));
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

  return NextResponse.redirect(new URL("/login/completar", origin));
}
