"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { formatNumber, rubricTotal, type AssignmentDTO } from "@/lib/grading";

type Student = { studentId: string; name: string; institutionId: string | null; active: boolean };
type SavedGrade = {
  studentId: string;
  score: number | null;
  optionCode: string | null;
  rubricScores: Record<string, number> | null;
  comment: string;
};
type Draft = { score: string; optionCode: string | null; rubricScores: Record<string, string>; comment: string };

function toDraft(g: SavedGrade | undefined): Draft {
  return {
    score: g?.score == null ? "" : String(g.score),
    optionCode: g?.optionCode ?? null,
    rubricScores: Object.fromEntries(Object.entries(g?.rubricScores ?? {}).map(([k, v]) => [k, String(v)])),
    comment: g?.comment ?? "",
  };
}

function isEmpty(d: Draft) {
  return d.score === "" && !d.optionCode && Object.values(d.rubricScores).every((v) => v === "") && !d.comment.trim();
}

/** Captura de calificaciones de una asignación, alumno por alumno (con rúbrica si la tiene). */
export default function GradeSheet({
  subjectId,
  assignmentId,
  onBack,
}: {
  subjectId: string;
  assignmentId: string;
  onBack: () => void;
}) {
  const [assignment, setAssignment] = useState<AssignmentDTO | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const apply = useCallback((json: { students: Student[]; grades: SavedGrade[] }) => {
    setStudents(json.students);
    const byId = new Map(json.grades.map((g) => [g.studentId, g]));
    setDrafts(Object.fromEntries(json.students.map((s) => [s.studentId, toDraft(byId.get(s.studentId))])));
    setDirty(new Set());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/subjects/${subjectId}/assignments/${assignmentId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.assignment) return;
        setAssignment(json.assignment);
        apply(json);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, assignmentId, apply]);

  if (!assignment) return <p className="text-sm text-[#a5a1bd]">Cargando…</p>;

  const a = assignment;
  const rubric = a.rubric;
  const rubricMax = rubricTotal(rubric);

  function update(studentId: string, patch: Partial<Draft>) {
    setDrafts((prev) => {
      const next = { ...prev[studentId], ...patch };
      // con escala numérica, los puntos de rúbrica calculan la calificación automáticamente
      if (patch.rubricScores && a.scaleType === "NUMERIC" && rubricMax > 0) {
        const got = Object.values(next.rubricScores).reduce((s, v) => s + (Number(v) || 0), 0);
        const anyScored = Object.values(next.rubricScores).some((v) => v !== "");
        next.score = anyScored ? formatNumber(Math.round((got / rubricMax) * (a.maxScore ?? 100) * 100) / 100) : "";
      }
      return { ...prev, [studentId]: next };
    });
    setDirty((prev) => new Set(prev).add(studentId));
    setMsg(null);
  }

  function fillPending() {
    if (!bulkValue) return;
    for (const s of students) {
      if (!s.active) continue;
      const d = drafts[s.studentId];
      const pending = a.scaleType === "NUMERIC" ? d.score === "" : !d.optionCode;
      if (!pending) continue;
      update(s.studentId, a.scaleType === "NUMERIC" ? { score: bulkValue } : { optionCode: bulkValue });
    }
  }

  async function save() {
    if (dirty.size === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const grades = [...dirty].map((studentId) => {
        const d = drafts[studentId];
        const rubricScores = Object.fromEntries(
          Object.entries(d.rubricScores)
            .filter(([, v]) => v !== "")
            .map(([k, v]) => [k, Number(v)]),
        );
        return {
          studentId,
          score: a.scaleType === "NUMERIC" && d.score !== "" ? Number(d.score) : null,
          optionCode: a.scaleType === "OPTIONS" ? d.optionCode : null,
          rubricScores: Object.keys(rubricScores).length ? rubricScores : null,
          comment: d.comment,
        };
      });
      const res = await fetch(`/api/subjects/${subjectId}/assignments/${assignmentId}/grades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron guardar las calificaciones");
      apply(json);
      setMsg({ text: "Calificaciones guardadas ✓", ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "No se pudo guardar", ok: false });
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty.size > 0 && !confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) return;
    onBack();
  }

  const gradedCount = students.filter((s) => {
    const d = drafts[s.studentId];
    return d && (a.scaleType === "NUMERIC" ? d.score !== "" : !!d.optionCode);
  }).length;

  return (
    <div>
      <button onClick={back} className="text-[13px] font-bold text-[#6d5efc] mb-3">
        ← Asignaciones
      </button>

      <div className="bg-white rounded-[20px] border border-[#f0eefb] p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="m-0 text-[20px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
              {a.name}
            </h2>
            <div className="text-[12.5px] font-bold text-[#a5a1bd] mt-0.5">
              {a.dueDate ? `Entrega: ${a.dueDate}` : "Sin fecha de entrega"} · Escala: {a.scaleName} · Peso{" "}
              {formatNumber(a.weight)}
            </div>
            {a.description && <p className="text-[13px] text-[#57546e] mt-2 mb-0">{a.description}</p>}
          </div>
          <div className="text-[13px] font-extrabold text-[#6d5efc]">
            {gradedCount}/{students.length} calificados
          </div>
        </div>
        {rubric.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {rubric.map((c) => (
              <span
                key={c.id}
                className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg bg-[#fff5e6] text-[#b56f00]"
                title={c.description}
              >
                {c.title} · {formatNumber(c.points)} pts
              </span>
            ))}
            <span className="text-[11.5px] font-extrabold px-2.5 py-1 rounded-lg bg-[#f2f0fd] text-[#6d5efc]">
              Total {formatNumber(rubricMax)} pts
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-[12.5px] font-extrabold text-[#6b6880]">Llenar pendientes con:</span>
        {a.scaleType === "NUMERIC" ? (
          <input
            type="number"
            min={0}
            max={a.maxScore ?? undefined}
            step="any"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="w-24 px-3 py-2 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm bg-white"
          />
        ) : (
          <select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="px-3 py-2 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm bg-white"
          >
            <option value="">—</option>
            {a.options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} {o.label && `(${o.label})`}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={fillPending}
          disabled={!bulkValue}
          className="px-3.5 py-2 rounded-xl bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-[13px] disabled:opacity-40"
        >
          Aplicar
        </button>
        <div className="flex-1" />
        {msg && (
          <span className={`text-[13px] font-bold ${msg.ok ? "text-[#0d9b81]" : "text-[#e0384a]"}`}>{msg.text}</span>
        )}
        <button
          onClick={save}
          disabled={saving || dirty.size === 0}
          className="px-5 py-2.5 rounded-xl brand-gradient text-white font-extrabold text-[13.5px] disabled:opacity-50"
        >
          {saving ? "Guardando…" : `Guardar${dirty.size ? ` (${dirty.size})` : ""}`}
        </button>
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-x-auto">
        <div
          className="grid px-5 py-3 text-[11.5px] font-extrabold text-[#a5a1bd] uppercase tracking-wide"
          style={{ background: "#faf9ff", gridTemplateColumns: "1.6fr 1.8fr 1.8fr", minWidth: 680 }}
        >
          <div>Alumno</div>
          <div>Calificación {a.scaleType === "NUMERIC" && `(0 – ${formatNumber(a.maxScore ?? 100)})`}</div>
          <div>Comentario</div>
        </div>
        {students.map((s) => {
          const d = drafts[s.studentId];
          if (!d) return null;
          const rubricGot = Object.values(d.rubricScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
          return (
            <Fragment key={s.studentId}>
              <div
                className="grid px-5 py-2.5 items-center text-[13.5px] border-t border-[#f4f2fc] gap-3"
                style={{
                  gridTemplateColumns: "1.6fr 1.8fr 1.8fr",
                  minWidth: 680,
                  opacity: s.active ? 1 : 0.55,
                  background: dirty.has(s.studentId) ? "#fffdf2" : undefined,
                }}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">{s.name}</div>
                  <div className="text-[11px] text-[#a5a1bd]">
                    {s.institutionId}
                    {!s.active && " · removido"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {a.scaleType === "NUMERIC" ? (
                    <input
                      type="number"
                      min={0}
                      max={a.maxScore ?? undefined}
                      step="any"
                      value={d.score}
                      onChange={(e) => update(s.studentId, { score: e.target.value })}
                      className="w-24 px-3 py-2 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm font-bold"
                      aria-label={`Calificación de ${s.name}`}
                    />
                  ) : (
                    <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={`Calificación de ${s.name}`}>
                      {a.options.map((o) => {
                        const active = d.optionCode === o.code;
                        return (
                          <button
                            key={o.code}
                            role="radio"
                            aria-checked={active}
                            title={o.label}
                            onClick={() => update(s.studentId, { optionCode: active ? null : o.code })}
                            className="min-w-10 h-9 px-2 rounded-[10px] font-black text-[13px] border-[1.5px]"
                            style={
                              active
                                ? { background: "#6d5efc", color: "#fff", borderColor: "#6d5efc" }
                                : { background: "#fff", color: "#6b6880", borderColor: "#e7e4f5" }
                            }
                          >
                            {o.code}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {rubric.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === s.studentId ? null : s.studentId)}
                      className="text-[12px] font-extrabold text-[#e08a00] px-2 py-1 rounded-lg bg-[#fff5e6]"
                    >
                      📋 Rúbrica {Object.values(d.rubricScores).some((v) => v !== "") && `${formatNumber(rubricGot)}/${formatNumber(rubricMax)}`}
                    </button>
                  )}
                </div>
                <input
                  value={d.comment}
                  onChange={(e) => update(s.studentId, { comment: e.target.value })}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-xl border-[1.5px] border-[#e7e4f5] text-[13px]"
                />
              </div>
              {expanded === s.studentId && (
                <div className="px-5 pb-3 pt-1 bg-[#fffaf0] border-t border-[#f4f2fc]" style={{ minWidth: 680 }}>
                  {rubric.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold">{c.title}</div>
                        {c.description && <div className="text-[11.5px] text-[#a5a1bd]">{c.description}</div>}
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={c.points}
                        step="any"
                        value={d.rubricScores[c.id] ?? ""}
                        onChange={(e) =>
                          update(s.studentId, { rubricScores: { ...d.rubricScores, [c.id]: e.target.value } })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                      />
                      <span className="text-[12px] font-bold text-[#a5a1bd] w-16">/ {formatNumber(c.points)} pts</span>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-[#a5a1bd] m-0 mt-1">
                    {a.scaleType === "NUMERIC"
                      ? `La calificación se calcula sola: puntos obtenidos ÷ ${formatNumber(rubricMax)} × ${formatNumber(a.maxScore ?? 100)}. Puedes ajustarla a mano.`
                      : "Los puntos de la rúbrica se guardan como referencia; elige la opción de calificación arriba."}
                  </p>
                </div>
              )}
            </Fragment>
          );
        })}
        {students.length === 0 && <div className="px-5 py-6 text-sm text-[#a5a1bd]">Nadie inscrito todavía.</div>}
      </div>
      {dirty.size > 0 && (
        <p className="mt-2 text-[12px] font-bold text-[#e08a00]">
          {dirty.size} alumno(s) con cambios sin guardar
          {[...dirty].some((id) => drafts[id] && isEmpty(drafts[id])) && " (los vacíos se borrarán al guardar)"}.
        </p>
      )}
    </div>
  );
}
