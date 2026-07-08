"use client";

import { useState } from "react";

type Justification = {
  id: string;
  name: string;
  subjectName: string;
  absenceDate: string;
  reason: string;
  fileName: string;
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
};

const STATUS_STYLE: Record<Justification["status"], { bg: string; fg: string; label: string }> = {
  PENDIENTE: { bg: "#fff5e6", fg: "#e08a00", label: "Pendiente" },
  APROBADA: { bg: "#e8faf5", fg: "#0d9b81", label: "Aprobada" },
  RECHAZADA: { bg: "#ffeef0", fg: "#e0384a", label: "Rechazada" },
};

const AV_PALETTE = [
  ["#ede9ff", "#6d5efc"],
  ["#ffe9df", "#ff7a59"],
  ["#dff7f0", "#17c0a4"],
  ["#ffe4f1", "#ff5c9d"],
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function JustificacionesView({
  initialJustifications,
}: {
  initialJustifications: Justification[];
}) {
  const [items, setItems] = useState(initialJustifications);
  const [days, setDays] = useState<Record<string, string>>(
    Object.fromEntries(initialJustifications.map((j) => [j.id, j.absenceDate])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/justifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, absenceDate: days[id] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: action === "approve" ? "APROBADA" : "RECHAZADA" } : j)),
      );
    } catch {
      // noop: el usuario puede reintentar
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="m-0 mb-1.5 text-[27px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
        Justificaciones
      </h1>
      <p className="mt-0 mb-5 text-[#6b6880] text-sm">
        Revisa las constancias que suben los alumnos. Al aprobar, elige el día que se marcará como
        justificado.
      </p>

      <div className="flex flex-col gap-4 max-w-[820px]">
        {items.map((j, i) => {
          const st = STATUS_STYLE[j.status];
          const av = AV_PALETTE[i % AV_PALETTE.length];
          return (
            <div
              key={j.id}
              className="bg-white rounded-[20px] p-5 border border-[#f0eefb]"
              style={{ boxShadow: "0 4px 16px rgba(40,30,90,.05)" }}
            >
              <div className="flex justify-between gap-4 flex-wrap">
                <div className="flex gap-3.5">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold flex-none"
                    style={{ background: av[0], color: av[1] }}
                  >
                    {initialsOf(j.name)}
                  </div>
                  <div>
                    <div className="font-extrabold text-[15.5px]">{j.name}</div>
                    <div className="text-[12.5px] text-[#a5a1bd]">
                      {j.subjectName} · Falta del {j.absenceDate}
                    </div>
                    <p className="mt-2 mb-0 text-[13.5px] text-[#57546e] max-w-[520px] leading-relaxed">
                      &ldquo;{j.reason}&rdquo;
                    </p>
                    <div className="mt-2.5">
                      <a
                        href={`/api/justifications/${j.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#f2f0fd] text-[#6d5efc] font-bold text-[12.5px] px-3 py-1.5 rounded-[10px]"
                      >
                        📎 {j.fileName} <span className="underline">Ver</span>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex-none">
                  <span
                    className="inline-block px-[13px] py-1.5 rounded-[10px] font-extrabold text-[12.5px]"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {st.label}
                  </span>
                </div>
              </div>

              {j.status === "PENDIENTE" && (
                <div className="flex items-center gap-2.5 flex-wrap mt-4 pt-4 border-t border-[#f4f2fc]">
                  <span className="text-[13px] text-[#6b6880] font-bold">Día a justificar:</span>
                  <input
                    type="date"
                    value={days[j.id]}
                    onChange={(e) => setDays((prev) => ({ ...prev, [j.id]: e.target.value }))}
                    className="px-3 py-2 rounded-[11px] border-[1.5px] border-[#e7e4f5] text-[13.5px] font-bold text-[#1a1830] bg-white"
                  />
                  <div className="ml-auto flex gap-2.5">
                    <button
                      disabled={busyId === j.id}
                      onClick={() => review(j.id, "reject")}
                      className="px-[18px] py-2.5 rounded-[11px] bg-white border-[1.5px] border-[#ffd5da] text-[#ff5c6c] font-extrabold text-[13.5px] disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      disabled={busyId === j.id}
                      onClick={() => review(j.id, "approve")}
                      className="px-[18px] py-2.5 rounded-[11px] bg-[#17c0a4] text-white font-extrabold text-[13.5px] disabled:opacity-50"
                    >
                      ✓ Aprobar y justificar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-[#a5a1bd] text-sm">No hay justificaciones todavía.</p>
        )}
      </div>
    </div>
  );
}
