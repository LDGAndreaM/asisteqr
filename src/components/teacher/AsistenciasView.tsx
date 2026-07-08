"use client";

import { useEffect, useState } from "react";

type Row = {
  studentId: string;
  name: string;
  institutionId: string | null;
  status: "PRESENTE" | "FALTA" | "JUSTIFICADO";
  time: string | null;
  locationStatus: "DENTRO" | "FUERA" | "NA";
};

const STATUS_STYLE: Record<Row["status"], { bg: string; fg: string; label: string }> = {
  PRESENTE: { bg: "#e8faf5", fg: "#0d9b81", label: "Presente" },
  FALTA: { bg: "#ffeef0", fg: "#e0384a", label: "Falta" },
  JUSTIFICADO: { bg: "#fff5e6", fg: "#e08a00", label: "Justificado" },
};

const LOC_STYLE: Record<Row["locationStatus"], { bg: string; fg: string; label: string }> = {
  DENTRO: { bg: "#eef7ff", fg: "#2b7fd4", label: "Dentro del aula" },
  FUERA: { bg: "#ffe9f2", fg: "#e0387f", label: "Fuera del área" },
  NA: { bg: "#f4f3ff", fg: "#a5a1bd", label: "—" },
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

export default function AsistenciasView({
  subjects,
  initialSubjectId,
}: {
  subjects: { id: string; name: string; icon: string }[];
  initialSubjectId: string | null;
}) {
  const [activeId, setActiveId] = useState(initialSubjectId);
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, justified: 0, outside: 0 });

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/subjects/${activeId}/attendance`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (cancelled) return;
      setRows(json.rows);
      setStats(json.stats);
    }
    load();
    const t = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeId]);

  if (!activeId) {
    return <p className="text-[#6b6880] text-sm">Crea una materia primero en “Materias”.</p>;
  }

  return (
    <div>
      <h1 className="m-0 mb-1.5 text-[27px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
        Asistencias
      </h1>
      <p className="mt-0 mb-4.5 mb-[18px] text-[#6b6880] text-sm">
        Sesión de hoy · registros en tiempo real conforme los alumnos escanean.
      </p>

      <div className="flex gap-2.5 flex-wrap mb-5">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
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

      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Presentes" value={stats.present} color="#17c0a4" />
        <StatCard label="Faltas" value={stats.absent} color="#ff5c6c" />
        <StatCard label="Justificadas" value={stats.justified} color="#ffb020" />
        <StatCard label="Fuera del área" value={stats.outside} color="#ff5c9d" />
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-hidden">
        <div
          className="grid px-5 py-3.5 text-[12px] font-extrabold text-[#a5a1bd] uppercase tracking-wide"
          style={{ background: "#faf9ff", gridTemplateColumns: "2.3fr 1fr 1fr 1.4fr" }}
        >
          <div>Alumno</div>
          <div>Estado</div>
          <div>Hora</div>
          <div>Ubicación</div>
        </div>
        {rows.map((r, i) => {
          const st = STATUS_STYLE[r.status];
          const loc = LOC_STYLE[r.locationStatus];
          const av = AV_PALETTE[i % AV_PALETTE.length];
          return (
            <div
              key={r.studentId}
              className="grid px-5 py-3.5 items-center text-[13.5px] border-t border-[#f4f2fc]"
              style={{ gridTemplateColumns: "2.3fr 1fr 1fr 1.4fr" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[13px]"
                  style={{ background: av[0], color: av[1] }}
                >
                  {initialsOf(r.name)}
                </div>
                <div>
                  <div className="font-bold">{r.name}</div>
                  <div className="text-[11.5px] text-[#a5a1bd]">{r.institutionId}</div>
                </div>
              </div>
              <div>
                <span
                  className="inline-block px-[11px] py-1 rounded-lg font-extrabold text-xs"
                  style={{ background: st.bg, color: st.fg }}
                >
                  {st.label}
                </span>
              </div>
              <div className="text-[#57546e] font-bold">{r.time ?? "—"}</div>
              <div>
                <span
                  className="inline-block px-[11px] py-1 rounded-lg font-bold text-xs"
                  style={{ background: loc.bg, color: loc.fg }}
                >
                  {loc.label}
                </span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-5 py-6 text-sm text-[#a5a1bd]">Ningún alumno inscrito todavía.</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl px-[18px] py-4 border border-[#f0eefb]">
      <div className="text-[12.5px] text-[#a5a1bd] font-bold">{label}</div>
      <div className="text-[26px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
