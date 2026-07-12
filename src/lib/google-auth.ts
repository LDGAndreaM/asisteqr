import "server-only";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { getSecretKey } from "@/lib/auth";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

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

export type GoogleProfile = { email: string; name: string };

/** Verifica un ID token emitido por Firebase Authentication tras iniciar sesión con Google. */
export async function verifyFirebaseIdToken(idToken: string): Promise<GoogleProfile> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase no está configurado");

  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Tu correo de Google no está verificado");
  }
  return {
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name : payload.email,
  };
}
