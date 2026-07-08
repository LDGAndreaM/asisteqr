"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function JoinSubjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/subjects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCode("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir a la materia");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-3 py-3 rounded-2xl bg-white border-[1.5px] border-dashed border-[#d9d5f0] text-[#6d5efc] font-bold text-[13.5px]"
      >
        + Unirme a una materia con clave
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 bg-white rounded-2xl p-4" style={{ boxShadow: "0 3px 12px rgba(40,30,90,.06)" }}>
      <label className="block text-[12px] font-bold text-[#6b6880] mb-1.5">Clave de la materia</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Ej. CALC-201"
        required
        className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-2 outline-none"
      />
      {error && <p className="text-[#e0384a] text-xs font-bold mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl bg-[#f4f3ff] text-[#6b6880] font-bold text-[13px]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] py-2.5 rounded-xl brand-gradient text-white font-bold text-[13px] disabled:opacity-60"
        >
          {loading ? "Uniendo…" : "Unirme"}
        </button>
      </div>
    </form>
  );
}
