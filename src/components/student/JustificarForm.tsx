"use client";

import { useState, type FormEvent } from "react";

export default function JustificarForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [absenceDate, setAbsenceDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Adjunta un documento (constancia médica, oficio, etc.)");
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.set("subjectId", subjectId);
      form.set("absenceDate", absenceDate);
      form.set("reason", reason);
      form.set("file", file);
      const res = await fetch("/api/justifications", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo enviar la justificación");
      setSent(true);
      setReason("");
      setAbsenceDate("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la justificación");
    } finally {
      setSending(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <div className="px-[22px] pt-3 pb-6">
        <div className="text-[21px] font-black mb-2" style={{ fontFamily: "var(--font-nunito)" }}>
          Justificar falta
        </div>
        <p className="text-sm text-[#a5a1bd]">Únete a una materia desde Inicio antes de justificar una falta.</p>
      </div>
    );
  }

  return (
    <div className="px-[22px] pt-3 pb-6">
      <div className="text-[21px] font-black mb-1" style={{ fontFamily: "var(--font-nunito)" }}>
        Justificar falta
      </div>
      <p className="mt-0 mb-4 text-[#a5a1bd] text-[13px]">Sube tu constancia y el maestro la revisará.</p>

      {sent && (
        <div
          className="rounded-[18px] p-[18px] text-center mb-[18px] animate-pop"
          style={{ background: "#e8faf5", border: "1.5px solid #b3ecdd" }}
        >
          <div className="text-[34px]">📨</div>
          <div className="font-black text-[#0d9b81] text-base mt-1.5">¡Justificación enviada!</div>
          <p className="mt-1.5 mb-0 text-[12.5px] text-[#0d6b5a]">Pendiente de revisión del maestro.</p>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Materia</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full px-[13px] py-[13px] rounded-[13px] border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 bg-white font-bold"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Fecha de la falta</label>
        <input
          type="date"
          value={absenceDate}
          onChange={(e) => setAbsenceDate(e.target.value)}
          required
          max={new Date().toISOString().slice(0, 10)}
          className="w-full px-[13px] py-3 rounded-[13px] border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 bg-white font-bold text-[#1a1830]"
        />

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Motivo</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe brevemente el motivo de tu falta…"
          required
          className="w-full px-[13px] py-[13px] rounded-[13px] border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 min-h-[80px] resize-none outline-none font-sans"
        />

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">
          Documento (constancia médica, etc.)
        </label>
        <label
          className="flex items-center justify-center p-5 rounded-2xl border-2 border-dashed cursor-pointer text-center"
          style={
            file
              ? { borderColor: "#b3ecdd", background: "#f0fcf8" }
              : { borderColor: "#d9d5f0", background: "#faf9ff" }
          }
        >
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {file ? (
            <span className="text-[#17c0a4] font-extrabold">📎 {file.name}</span>
          ) : (
            <span className="text-[#a5a1bd] font-bold">⬆️ Toca para subir PDF o imagen</span>
          )}
        </label>

        {error && <p className="text-[#e0384a] text-[13px] font-bold text-center mt-3">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="w-full mt-4 py-[15px] rounded-[15px] brand-gradient text-white font-extrabold text-[15px] disabled:opacity-60"
          style={{ boxShadow: "0 12px 24px rgba(109,94,252,.35)" }}
        >
          {sending ? "Enviando…" : "Enviar justificación"}
        </button>
      </form>
    </div>
  );
}
