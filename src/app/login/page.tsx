"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Role = "maestro" | "alumno";
type Mode = "login" | "register";

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
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
              <rect x="15" y="15" width="2.5" height="2.5" fill="#fff" />
              <rect x="19" y="15" width="2" height="2" fill="#fff" />
              <rect x="15" y="19" width="2" height="2" fill="#fff" />
              <rect x="19" y="19" width="2" height="2" fill="#fff" />
            </svg>
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
