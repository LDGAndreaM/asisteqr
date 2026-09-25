"use client";

import { useState } from "react";

/** Código corto con el que los alumnos se unen a la materia; se puede copiar, regenerar o desactivar. */
export default function JoinCodeCard({
  subjectId,
  initialCode,
  initialEnabled,
}: {
  subjectId: string;
  initialCode: string;
  initialEnabled: boolean;
}) {
  const [code, setCode] = useState(initialCode);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMsg("Código copiado");
    } catch {
      setMsg("No se pudo copiar; cópialo a mano");
    }
  }

  async function regenerate() {
    if (!confirm("Se generará un código nuevo y el actual dejará de funcionar. ¿Continuar?")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/subjects/${subjectId}/join-code`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo regenerar");
      setCode(json.joinCode);
      setMsg("Código nuevo generado");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "No se pudo regenerar");
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinEnabled: !enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar");
      setEnabled(json.subject.joinEnabled);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-[20px] border border-[#f0eefb] p-4 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="font-extrabold text-sm">Código para unirse</div>
        <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#6b6880] cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={toggle} disabled={busy} className="accent-[#6d5efc]" />
          Activo
        </label>
      </div>
      <div
        className="text-center text-[30px] font-black tracking-[0.3em] py-3 rounded-xl mb-2 select-all"
        style={{
          fontFamily: "var(--font-nunito)",
          background: enabled ? "#f2f0fd" : "#f6f5fa",
          color: enabled ? "#6d5efc" : "#c5c1dc",
        }}
      >
        {code}
      </div>
      <p className="text-[11.5px] text-[#a5a1bd] mb-3">
        {enabled
          ? "Los alumnos lo escriben en su app (Inicio → “Unirme con código”)."
          : "Inscripción por código desactivada: solo por invitación de correo."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 py-2 rounded-xl bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-[12.5px]"
        >
          📋 Copiar
        </button>
        <button
          onClick={regenerate}
          disabled={busy}
          className="flex-1 py-2 rounded-xl bg-[#fff5e6] text-[#e08a00] font-extrabold text-[12.5px] disabled:opacity-50"
        >
          🔄 Nuevo código
        </button>
      </div>
      {msg && <p className="text-[12px] font-bold text-[#0d9b81] mt-2">{msg}</p>}
    </div>
  );
}
