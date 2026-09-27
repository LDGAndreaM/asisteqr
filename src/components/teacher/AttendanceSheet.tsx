"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "PRESENTE" | "RETARDO" | "FALTA" | "JUSTIFICADO";
type Mark = "PRESENTE" | "RETARDO" | "FALTA";

type Row = {
  studentId: string;
  name: string;
  institutionId: string | null;
  status: Status;
  recorded: boolean;
  source: "QR" | "MANUAL" | null;
  time: string | null;
  locationStatus: "DENTRO" | "FUERA" | "NA";
};

const MARKS: { value: Mark; short: string; label: string; bg: string; fg: string }[] = [
  { value: "PRESENTE", short: "P", label: "Presente", bg: "#17c0a4", fg: "#fff" },
  { value: "RETARDO", short: "R", label: "Retardo", bg: "#ffb020", fg: "#fff" },
  { value: "FALTA", short: "F", label: "Falta", bg: "#ff5c6c", fg: "#fff" },
];

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

/**
 * Lista de asistencia de una materia para una fecha: muestra en vivo lo que llega por QR y
 * permite al maestro pasar lista a mano (Presente / Retardo / Falta) alumno por alumno o en bloque.
 * Quien lo use debe darle `key={subjectId}` para reiniciar el estado al cambiar de materia.
 */
export default function AttendanceSheet({ subjectId }: { subjectId: string }) {
  // null = hoy (según el servidor)
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // mientras hay guardados en curso ignoramos el sondeo para no pisar los cambios optimistas
  const pending = useRef(0);

  const load = useCallback(async () => {
    const qs = date ? `?date=${date}` : "";
    const res = await fetch(`/api/subjects/${subjectId}/attendance${qs}`, { cache: "no-store" });
    if (!res.ok || pending.current > 0) return;
    const json = await res.json();
    if (pending.current > 0) return;
    setRows(json.rows);
    setLoadedDate(json.date);
    if (!date) setToday(json.date);
  }, [subjectId, date]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) load();
    };
    run();
    // en vivo solo para el día de hoy, que es cuando llegan escaneos
    if (date && date !== today) return () => {
      cancelled = true;
    };
    const t = setInterval(run, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [load, date, today]);

  async function save(entries: { studentId: string; status: Mark | null }[]) {
    if (entries.length === 0 || !loadedDate) return;
    setError("");
    setSaving(true);
    pending.current++;
    // actualización optimista
    const byId = new Map(entries.map((e) => [e.studentId, e.status]));
    setRows((prev) =>
      prev.map((r) => {
        if (!byId.has(r.studentId)) return r;
        const status = byId.get(r.studentId)!;
        return status === null
          ? { ...r, status: "FALTA" as const, recorded: false, source: null, time: null }
          : { ...r, status, recorded: true, source: "MANUAL" as const, time: null };
      }),
    );
    try {
      const res = await fetch(`/api/subjects/${subjectId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: loadedDate, entries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      pending.current--;
      setSaving(false);
      if (pending.current === 0) load();
    }
  }

  function onMark(r: Row, mark: Mark) {
    const current = r.recorded ? r.status : null;
    // tocar la opción ya seleccionada la quita (vuelve a "sin registrar")
    save([{ studentId: r.studentId, status: current === mark ? null : mark }]);
  }

  const stats = {
    present: rows.filter((r) => r.status === "PRESENTE").length,
    late: rows.filter((r) => r.status === "RETARDO").length,
    absent: rows.filter((r) => r.status === "FALTA").length,
    justified: rows.filter((r) => r.status === "JUSTIFICADO").length,
    outside: rows.filter((r) => r.locationStatus === "FUERA").length,
  };
  const unrecorded = rows.filter((r) => !r.recorded && r.status !== "JUSTIFICADO");
  const isToday = !date || date === today;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label className="flex items-center gap-2 text-[13px] font-extrabold text-[#6b6880]">
          📅 Fecha
          <input
            type="date"
            value={date ?? today ?? ""}
            max={today ?? undefined}
            onChange={(e) => setDate(e.target.value || null)}
            className="px-3 py-2 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm bg-white outline-none"
          />
        </label>
        {!isToday && (
          <button onClick={() => setDate(null)} className="text-[13px] font-bold text-[#6d5efc] underline">
            Volver a hoy
          </button>
        )}
        {isToday && (
          <span className="text-[12px] font-bold text-[#0d9b81] bg-[#e8faf5] px-2.5 py-1 rounded-lg">
            ● En vivo
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => save(unrecorded.map((r) => ({ studentId: r.studentId, status: "PRESENTE" })))}
          disabled={unrecorded.length === 0 || saving}
          className="px-3.5 py-2 rounded-xl bg-[#e8faf5] text-[#0d9b81] font-extrabold text-[13px] disabled:opacity-40"
        >
          ✓ Pendientes como presente ({unrecorded.length})
        </button>
        <button
          onClick={() => save(unrecorded.map((r) => ({ studentId: r.studentId, status: "FALTA" })))}
          disabled={unrecorded.length === 0 || saving}
          className="px-3.5 py-2 rounded-xl bg-[#ffeef0] text-[#e0384a] font-extrabold text-[13px] disabled:opacity-40"
        >
          ✕ Pendientes como falta
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Presentes" value={stats.present} color="#17c0a4" />
        <StatCard label="Retardos" value={stats.late} color="#ffb020" />
        <StatCard label="Faltas / sin registrar" value={stats.absent} color="#ff5c6c" />
        <StatCard label="Justificadas" value={stats.justified} color="#e08a00" />
        <StatCard label="Fuera del área" value={stats.outside} color="#ff5c9d" />
      </div>

      {error && <p className="text-[#e0384a] text-[13px] font-bold mb-3">{error}</p>}

      <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-hidden overflow-x-auto">
        <div
          className="grid px-5 py-3.5 text-[12px] font-extrabold text-[#a5a1bd] uppercase tracking-wide"
          style={{ background: "#faf9ff", gridTemplateColumns: "2.2fr 1.3fr 1.3fr 1.6fr", minWidth: 640 }}
        >
          <div>Alumno</div>
          <div>Registro</div>
          <div>Ubicación</div>
          <div>Pasar lista</div>
        </div>
        {rows.map((r, i) => {
          const loc = LOC_STYLE[r.locationStatus];
          const av = AV_PALETTE[i % AV_PALETTE.length];
          const selected = r.recorded ? r.status : null;
          return (
            <div
              key={r.studentId}
              className="grid px-5 py-3 items-center text-[13.5px] border-t border-[#f4f2fc]"
              style={{ gridTemplateColumns: "2.2fr 1.3fr 1.3fr 1.6fr", minWidth: 640 }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[13px] flex-none"
                  style={{ background: av[0], color: av[1] }}
                >
                  {initialsOf(r.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{r.name}</div>
                  <div className="text-[11.5px] text-[#a5a1bd]">{r.institutionId}</div>
                </div>
              </div>
              <div className="text-[12.5px] font-bold text-[#57546e]">
                {r.status === "JUSTIFICADO" && !r.recorded ? (
                  <span className="px-2.5 py-1 rounded-lg bg-[#fff5e6] text-[#e08a00] font-extrabold text-xs">
                    Justificado
                  </span>
                ) : !r.recorded ? (
                  <span className="text-[#a5a1bd]">Sin registrar</span>
                ) : r.source === "QR" ? (
                  <span>📷 QR {r.time}</span>
                ) : (
                  <span>✍️ Manual</span>
                )}
              </div>
              <div>
                <span
                  className="inline-block px-[11px] py-1 rounded-lg font-bold text-xs"
                  style={{ background: loc.bg, color: loc.fg }}
                >
                  {loc.label}
                </span>
              </div>
              <div className="flex gap-1.5" role="radiogroup" aria-label={`Asistencia de ${r.name}`}>
                {MARKS.map((m) => {
                  const active = selected === m.value;
                  return (
                    <button
                      key={m.value}
                      role="radio"
                      aria-checked={active}
                      title={m.label}
                      onClick={() => onMark(r, m.value)}
                      className="w-10 h-9 rounded-[10px] font-black text-[13px] border-[1.5px] transition-colors"
                      style={
                        active
                          ? { background: m.bg, color: m.fg, borderColor: m.bg }
                          : { background: "#fff", color: "#a5a1bd", borderColor: "#e7e4f5" }
                      }
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-5 py-6 text-sm text-[#a5a1bd]">Ningún alumno inscrito todavía.</div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-[#a5a1bd] font-bold">
        P = Presente · R = Retardo (cuenta como asistencia) · F = Falta. Toca de nuevo la opción marcada para
        quitarla. Los escaneos QR aparecen solos y puedes corregirlos aquí.
      </p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl px-[16px] py-3.5 border border-[#f0eefb]">
      <div className="text-[12px] text-[#a5a1bd] font-bold">{label}</div>
      <div className="text-[24px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
