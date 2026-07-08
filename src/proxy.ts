import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "asisteqr_session";

async function readRole(req: NextRequest): Promise<"TEACHER" | "STUDENT" | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "STUDENT" ? "STUDENT" : payload.role === "TEACHER" ? "TEACHER" : null;
  } catch {
    return null;
  }
}

// Chequeo optimista de sesión/rol para redirigir rápido; la autorización real
// (con consulta a la base de datos) se aplica de nuevo en cada route handler / server component.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await readRole(req);

  if (pathname.startsWith("/teacher")) {
    if (role !== "TEACHER") return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/student")) {
    if (role !== "STUDENT") return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(role === "TEACHER" ? "/teacher" : "/student", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*", "/login"],
};
