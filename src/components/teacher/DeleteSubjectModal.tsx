"use client";

import { useState } from "react";

export default function DeleteSubjectModal({
  subjectId,
  subjectName,
  onClose,
  onDeleted,
}: {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === subjectName;

  async function onConfirm() {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "No se pudo eliminar la materia");
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la materia");
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(20,14,50,.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[24px] p-7 w-full max-w-[440px] animate-pop"
        style={{ boxShadow: "0 30px 70px rgba(20,14,50,.4)" }}
      >
        <div className="text-[34px] mb-2">⚠️</div>
        <h2 className="mt-0 mb-1 text-[20px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
          Eliminar &ldquo;{subjectName}&rdquo; para siempre
        </h2>
        <p className="mt-0 mb-4 text-[#6b6880] text-[13.5px] leading-relaxed">
          Esto borra la materia, su lista de alumnos y <b>todo</b> su historial: asistencias
          registradas y justificaciones. No se puede deshacer.
        </p>

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">
          Escribe <b>{subjectName}</b> para confirmar
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={subjectName}
          className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 outline-none"
        />

        {error && <p className="text-[#e0384a] text-[13px] font-bold text-center mb-3.5 -mt-2">{error}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-[13px] rounded-xl bg-[#f4f3ff] text-[#6b6880] font-extrabold text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete || deleting}
            className="flex-[2] py-[13px] rounded-xl bg-[#e0384a] text-white font-extrabold text-sm disabled:opacity-40"
          >
            {deleting ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}
