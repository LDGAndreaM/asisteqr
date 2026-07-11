"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CompletarRegistroPage() {
  const router = useRouter();
  const [pending, setPending] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [institutionId, setInstitutionId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/pending")
      .then((r) => r.json())
      .then((json) => setPending(json.pending))
      .catch(() => setPending(null));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/google/complete-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo completar tu registro");
      router.push("/student");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar tu registro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-8"
      style={{
        background:
          "radial-gradient(1200px 700px at 18% -5%,#ffd24a 0%,rgba(255,210,74,0) 52%),radial-gradient(1100px 650px at 92% 108%,#2f6bff 0%,rgba(47,107,255,0) 55%),linear-gradient(150deg,#2f6bff,#ffc22e)",
      }}
    >
      <div className="w-full max-w-[420px] bg-white rounded-[24px] px-6 py-[26px] shadow-[0_30px_60px_rgba(30,20,80,.35)]">
        <h1 className="m-0 mb-1 text-[22px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
          Un último paso
        </h1>

        {pending === undefined && <p className="text-sm text-[#a5a1bd]">Cargando…</p>}

        {pending === null && (
          <div>
            <p className="text-sm text-[#6b6880] mt-2 mb-4">
              Tu sesión de Google expiró o ya la usaste. Vuelve a intentar desde el inicio.
            </p>
            <a
              href="/login"
              className="block text-center w-full py-[13px] rounded-[14px] brand-gradient text-white font-extrabold text-[15px]"
            >
              Volver al login
            </a>
          </div>
        )}

        {pending && (
          <>
            <p className="text-[#6b6880] text-[13.5px] mt-1 mb-5">
              Ya verificamos tu cuenta de Google. Solo falta tu ID de institución para terminar tu
              registro como alumno.
            </p>

            <div className="bg-[#f4f3ff] rounded-xl px-3.5 py-3 mb-4">
              <div className="font-bold text-sm">{pending.name}</div>
              <div className="text-xs text-[#a5a1bd]">{pending.email}</div>
            </div>

            <form onSubmit={onSubmit}>
              <label className="block text-[12.5px] font-bold text-[#6b6880] mb-1.5">
                ID de la institución
              </label>
              <input
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="Ej. 2021030456"
                required
                className="w-full px-3.5 py-3.5 rounded-[13px] border-[1.5px] border-[#e7e4f5] text-[14.5px] mb-3.5 outline-none"
              />

              {error && (
                <p className="text-[#e0384a] text-[13px] font-bold text-center mb-3.5 -mt-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-[15px] rounded-[14px] brand-gradient text-white font-extrabold text-[15.5px] shadow-[0_12px_24px_rgba(109,94,252,.4)] disabled:opacity-60"
              >
                {saving ? "Un momento…" : "Terminar registro →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
