import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleOAuthConfigured, signOAuthState } from "@/lib/google-auth";

function loginError(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  if (!googleOAuthConfigured()) {
    return loginError(req.nextUrl.origin, "El inicio de sesión con Google no está configurado todavía");
  }

  const role = req.nextUrl.searchParams.get("role");
  if (role !== "maestro" && role !== "alumno") {
    return loginError(req.nextUrl.origin, "Rol inválido");
  }

  const state = await signOAuthState(role);
  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();
  const authUrl = buildGoogleAuthUrl({ redirectUri, state });

  return NextResponse.redirect(authUrl);
}
