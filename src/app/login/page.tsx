"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, firebaseConfigured } from "@/lib/firebase-client";
import Logo from "@/components/Logo";

type Role = "maestro" | "alumno";
type Mode = "login" | "register";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("maestro");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogleClick() {
    setError("");
    if (!firebaseConfigured()) {
      setError("El inicio de sesión con Google no está configurado todavía");
      return;
    }
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const res = await fetch("/api/auth/google/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión con Google");
        return;
      }
      if (data.status === "needs_registration") {
        router.push("/login/completar");
        return;
      }
      router.push(data.role === "STUDENT" ? "/student" : "/teacher");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") {
        // el usuario cerró la ventana, no es un error real
      } else if (code === "auth/unauthorized-domain") {
        setError("Este dominio no está autorizado en Firebase todavía");
      } else {
        setError("No se pudo iniciar sesión con Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { role, email, password, institutionId }
          : { role, name, email, password, institutionId };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Algo salió mal");
        return;
      }
      router.push(data.role === "STUDENT" ? "/student" : "/teacher");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  const isStudent = role === "alumno";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-8"
      style={{
        background:
          "radial-gradient(1200px 700px at 18% -5%,#ffd24a 0%,rgba(255,210,74,0) 52%),radial-gradient(1100px 650px at 92% 108%,#2f6bff 0%,rgba(47,107,255,0) 55%),linear-gradient(150deg,#2f6bff,#ffc22e)",
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-[22px] text-white">
          <div className="w-[70px] h-[70px] rounded-[22px] bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3.5 shadow-[0_12px_30px_rgba(0,0,0,.18)] animate-floaty">
            <Logo size={38} />
          </div>
          <h1
            className="m-0 text-[30px] font-black tracking-[-.5px]"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            AsisteQR
          </h1>
          <p className="mt-1.5 mb-0 opacity-85 text-[14.5px]">
            Asistencia por código QR con ubicación
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-[24px] px-6 py-[26px] shadow-[0_30px_60px_rgba(30,20,80,.35)]"
        >
          <div className="flex gap-2 bg-[#f1effb] p-[5px] rounded-[14px] mb-5">
            <button
              type="button"
              onClick={() => setRole("maestro")}
              className="flex-1 py-[11px] rounded-[11px] font-extrabold text-sm transition-all"
              style={
                role === "maestro"
                  ? { background: "#fff", color: "#6d5efc", boxShadow: "0 3px 8px rgba(109,94,252,.18)" }
                  : { background: "transparent", color: "#a5a1bd" }
              }
            >
              👩‍🏫 Maestro
            </button>
            <button
              type="button"
              onClick={() => setRole("alumno")}
              className="flex-1 py-[11px] rounded-[11px] font-extrabold text-sm transition-all"
              style={
                role === "alumno"
                  ? { background: "#fff", color: "#6d5efc", boxShadow: "0 3px 8px rgba(109,94,252,.18)" }
                  : { background: "transparent", color: "#a5a1bd" }
              }
            >
              🎓 Alumno
            </button>
          </div>

          <button
            type="button"
            onClick={onGoogleClick}
            disabled={googleLoading}
            className="w-full mb-4 flex items-center justify-center gap-2.5 py-[13px] rounded-[13px] border-[1.5px] border-[#e7e4f5] font-bold text-[14px] text-[#1a1830] bg-white disabled:opacity-60"
          >
            <GoogleLogo /> {googleLoading ? "Conectando…" : "Continuar con Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#e7e4f5]" />
            <span className="text-[11.5px] font-bold text-[#a5a1bd]">o con tu correo</span>
            <div className="h-px flex-1 bg-[#e7e4f5]" />
          </div>

          {mode === "register" && (
            <>
              <label className="block text-[12.5px] font-bold text-[#6b6880] mb-1.5">Nombre completo</label>
              <div className="flex items-center gap-2 border-[1.5px] border-[#e7e4f5] rounded-[13px] px-3.5 mb-3.5">
                <span className="text-[15px]">🙋</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="border-none outline-none py-3.5 text-[14.5px] w-full bg-transparent"
                />
              </div>
            </>
          )}

          <label className="block text-[12.5px] font-bold text-[#6b6880] mb-1.5">Usuario (correo)</label>
          <div className="flex items-center gap-2 border-[1.5px] border-[#e7e4f5] rounded-[13px] px-3.5 mb-3.5">
            <span className="text-[15px]">📧</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.usuario@institucion.mx"
              required
              className="border-none outline-none py-3.5 text-[14.5px] w-full bg-transparent"
            />
          </div>

          <label className="block text-[12.5px] font-bold text-[#6b6880] mb-1.5">Contraseña</label>
          <div className="flex items-center gap-2 border-[1.5px] border-[#e7e4f5] rounded-[13px] px-3.5 mb-3.5">
            <span className="text-[15px]">🔒</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={mode === "register" ? 6 : undefined}
              className="border-none outline-none py-3.5 text-[14.5px] w-full bg-transparent"
            />
          </div>

          {isStudent && (
            <div>
              <label className="block text-[12.5px] font-bold text-[#6b6880] mb-1.5">
                ID de la institución
              </label>
              <div className="flex items-center gap-2 border-[1.5px] border-[#e7e4f5] rounded-[13px] px-3.5 mb-3.5">
                <span className="text-[15px]">🪪</span>
                <input
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder="Ej. 2021030456"
                  required
                  className="border-none outline-none py-3.5 text-[14.5px] w-full bg-transparent"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-[#e0384a] text-[13px] font-bold text-center mb-3.5 -mt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[15px] rounded-[14px] brand-gradient text-white font-extrabold text-[15.5px] shadow-[0_12px_24px_rgba(109,94,252,.4)] disabled:opacity-60"
          >
            {loading
              ? "Un momento…"
              : mode === "login"
              ? `Entrar como ${isStudent ? "alumno" : "maestro"} →`
              : `Crear cuenta de ${isStudent ? "alumno" : "maestro"} →`}
          </button>

          <p className="text-center mt-4 mb-0 text-xs text-[#a5a1bd]">
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="font-bold text-[#6d5efc] underline"
            >
              {mode === "login" ? "Créala aquí" : "Inicia sesión"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
