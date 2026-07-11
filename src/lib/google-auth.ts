import "server-only";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { getSecretKey } from "@/lib/auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const STATE_TTL_SECONDS = 60 * 10; // 10 minutos para completar el flujo de OAuth

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Token de estado firmado: lleva el rol elegido (maestro/alumno) y protege contra CSRF. */
export async function signOAuthState(role: "maestro" | "alumno") {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyOAuthState(token: string): Promise<{ role: "maestro" | "alumno" } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "maestro" && payload.role !== "alumno") return null;
    return { role: payload.role };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(params: { redirectUri: string; state: string }) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCodeForIdToken(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo intercambiar el código con Google (${res.status})`);
  }
  const json = await res.json();
  if (typeof json.id_token !== "string") {
    throw new Error("Google no devolvió un id_token");
  }
  return json.id_token as string;
}

export const PENDING_STUDENT_COOKIE = "asisteqr_google_pending";
export const PENDING_STUDENT_TTL_SECONDS = 60 * 10; // 10 minutos para terminar el registro

export async function signPendingStudent(profile: { email: string; name: string }) {
  return new SignJWT({ email: profile.email, name: profile.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_STUDENT_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyPendingStudent(token: string): Promise<{ email: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return { email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export type GoogleProfile = { email: string; name: string; sub: string };

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  if (typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Tu correo de Google no está verificado");
  }
  if (typeof payload.sub !== "string") {
    throw new Error("Respuesta de Google inválida");
  }
  return {
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name : payload.email,
    sub: payload.sub,
  };
}
