"use client";

import { useEffect, useState } from "react";

type DayCellStatus = "PRESENTE" | "FALTA" | "JUSTIFICADO" | "SIN_CLASE";

type WeeklyRow = {
  studentId: string;
  name: string;
  cells: DayCellStatus[];
  present: number;
  absent: number;
  justified: number;
};

type WeeklyResponse = {
  days: { short: string; dnum: number; mon: string }[];
  weekLabel: string;
  canGoNext: boolean;
  rows: WeeklyRow[];
};

const CELL_STYLE: Record<DayCellStatus, { label: string; bg: string; fg: string }> = {
  PRESENTE: { label: "✓", bg: "#e8faf5", fg: "#0d9b81" },
  FALTA: { label: "✕", bg: "#ffeef0", fg: "#e0384a" },
  JUSTIFICADO: { label: "◐", bg: "#fff5e6", fg: "#e08a00" },
  SIN_CLASE: { label: "·", bg: "transparent", fg: "#cfcbe6" },
};

const AV_PALETTE = [
  ["#ede9ff", "#6d5efc"],
  ["#ffe9df", "#ff7a59"],
  ["#dff7f0", "#17c0a4"],
  ["#ffe4f1", "#ff5c9d"],
  ["#e9efff", "#5b8def"],
  ["#fff3d6", "#e0a000"],
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function ReportesView({ subjects }: { subjects: { id: string; name: string; icon: string }[] }) {
  const [activeId, setActiveId] = useState(subjects[0]?.id ?? null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<WeeklyResponse | null>(null);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/reports/weekly?subjectId=${activeId}&weekOffset=${weekOffset}`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (!cancelled) setData(json);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeId, weekOffset]);

  if (!activeId) {
    return <p className="text-[#6b6880] text-sm">Crea una materia primero en “Materias”.</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="m-0 text-[27px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
            Reporte semanal
          </h1>
          <p className="mt-1 mb-0 text-[#6b6880] text-sm">
            Días que asistió o faltó cada alumno. Descárgalo para Excel.
          </p>
        </div>
        <div className="flex gap-2.5">
          <a
            href={`/api/reports/export?subjectId=${activeId}&weekOffset=${weekOffset}&format=csv`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1830] text-white font-extrabold text-[13.5px]"
          >
            ⬇ CSV
          </a>
          <a
            href={`/api/reports/export?subjectId=${activeId}&weekOffset=${weekOffset}&format=xlsx`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-extrabold text-[13.5px]"
            style={{ background: "#1e7145" }}
          >
            📊 Excel
          </a>
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap mb-4">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setActiveId(s.id);
              setWeekOffset(0);
            }}
            className="px-[15px] py-[9px] rounded-xl font-extrabold text-[13px] border-[1.5px]"
            style={
              activeId === s.id
                ? { borderColor: "#6d5efc", background: "#6d5efc", color: "#fff" }
                : { borderColor: "#e7e4f5", background: "#fff", color: "#6b6880" }
            }
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3.5 mb-4">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="w-[38px] h-[38px] rounded-[11px] bg-white border-[1.5px] border-[#e7e4f5] text-[#6d5efc] font-black text-base"
        >
          ‹
        </button>
        <div className="font-extrabold text-[15px]">📅 {data?.weekLabel ?? "…"}</div>
        <button
          onClick={() => data?.canGoNext && setWeekOffset((w) => w + 1)}
          disabled={!data?.canGoNext}
          className="w-[38px] h-[38px] rounded-[11px] font-black text-base border-[1.5px]"
          style={
            data?.canGoNext
              ? { background: "#fff", color: "#6d5efc", borderColor: "#e7e4f5" }
              : { background: "#f6f5ff", color: "#d5d1f2", borderColor: "#e7e4f5", cursor: "not-allowed" }
          }
        >
          ›
        </button>
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-hidden overflow-x-auto">
        <div
          className="grid px-[18px] py-3.5 text-[11.5px] font-extrabold text-[#a5a1bd] uppercase tracking-wide items-center"
          style={{ gridTemplateColumns: "1.9fr repeat(5,.78fr) .82fr .82fr", background: "#faf9ff", minWidth: 620 }}
        >
          <div>Alumno</div>
          {data?.days.map((d) => (
            <div key={d.short} className="text-center leading-tight">
              {d.short} {d.dnum}
              <br />
              <span className="font-bold text-[10px] normal-case text-[#c5c1dc]">{d.mon}</span>
            </div>
          ))}
          <div className="text-center" style={{ color: "#0d9b81" }}>Asistió</div>
          <div className="text-center" style={{ color: "#e0384a" }}>Faltó</div>
        </div>
        {data?.rows.map((r, i) => {
          const av = AV_PALETTE[i % AV_PALETTE.length];
          return (
            <div
              key={r.studentId}
              className="grid px-[18px] py-2.5 items-center gap-1.5 border-t border-[#f4f2fc]"
              style={{ gridTemplateColumns: "1.9fr repeat(5,.78fr) .82fr .82fr", minWidth: 620 }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-extrabold text-[12.5px] flex-none"
                  style={{ background: av[0], color: av[1] }}
                >
                  {initialsOf(r.name)}
                </div>
                <div className="font-bold text-[13.5px]">{r.name}</div>
              </div>
              {r.cells.map((c, ci) => {
                const cs = CELL_STYLE[c];
                return (
                  <div
                    key={ci}
                    className="flex items-center justify-center h-[34px] rounded-[9px] font-black text-sm"
                    style={{ background: cs.bg, color: cs.fg }}
                  >
                    {cs.label}
                  </div>
                );
              })}
              <div className="text-center font-black text-[15px]" style={{ color: "#0d9b81" }}>{r.present}</div>
              <div className="text-center font-black text-[15px]" style={{ color: "#e0384a" }}>{r.absent}</div>
            </div>
          );
        })}
        {data?.rows.length === 0 && (
          <div className="px-[18px] py-6 text-sm text-[#a5a1bd]">Ningún alumno inscrito todavía.</div>
        )}
      </div>

      <div className="flex gap-[18px] mt-4 text-[12.5px] text-[#6b6880] font-bold flex-wrap">
        <Legend bg="#e8faf5" fg="#0d9b81" label="Presente" symbol="✓" />
        <Legend bg="#ffeef0" fg="#e0384a" label="Falta" symbol="✕" />
        <Legend bg="#fff5e6" fg="#e08a00" label="Justificado" symbol="◐" />
        <Legend bg="transparent" fg="#cfcbe6" label="Sin clase ese día" symbol="·" />
      </div>
    </div>
  );
}

function Legend({ bg, fg, label, symbol }: { bg: string; fg: string; label: string; symbol: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-[22px] h-[22px] rounded-[7px] flex items-center justify-center font-black"
        style={{ background: bg, color: fg }}
      >
        {symbol}
      </span>{" "}
      {label}
    </span>
  );
}
