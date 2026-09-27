"use client";

import { useCallback, useEffect, useState } from "react";
import AssignmentFormModal from "@/components/teacher/AssignmentFormModal";
import GradeSheet from "@/components/teacher/GradeSheet";
import { describeScale, formatNumber, rubricTotal, type AssignmentDTO } from "@/lib/grading";

type GradebookRow = {
  studentId: string;
  name: string;
  institutionId: string | null;
  active: boolean;
  cells: { display: string | null; percent: number | null; comment: string }[];
  average: number | null;
};

function formatDate(d: string | null) {
  if (!d) return "Sin fecha";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function percentColor(p: number | null) {
  if (p == null) return "#c5c1dc";
  return p >= 80 ? "#0d9b81" : p >= 60 ? "#e08a00" : "#e0384a";
}

/** Asignaciones de una materia: lista, libreta de calificaciones y exportación. */
export default function AssignmentsPanel({ subjectId }: { subjectId: string }) {
  const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
  const [rows, setRows] = useState<GradebookRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentDTO | null>(null);
  const [grading, setGrading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/subjects/${subjectId}/assignments`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "No se pudieron cargar las asignaciones");
      return;
    }
    setAssignments(json.assignments);
    setRows(json.rows);
    setLoaded(true);
  }, [subjectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API
    load();
  }, [load]);

  async function remove(a: AssignmentDTO) {
    if (!confirm(`¿Eliminar "${a.name}" y todas sus calificaciones? No se puede deshacer.`)) return;
    const res = await fetch(`/api/subjects/${subjectId}/assignments/${a.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (grading) {
    return (
      <GradeSheet
        subjectId={subjectId}
        assignmentId={grading}
        onBack={() => {
          setGrading(null);
          load();
        }}
      />
    );
  }

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="m-0 text-[#6b6880] text-sm">
          Registra tareas, proyectos y exámenes; captura calificaciones con la escala y rúbrica que prefieras.
        </p>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`/api/subjects/${subjectId}/assignments/export?format=csv`}
            className="px-3.5 py-2.5 rounded-xl bg-[#1a1830] text-white font-extrabold text-[13px]"
          >
            ⬇ CSV
          </a>
          <a
            href={`/api/subjects/${subjectId}/assignments/export?format=xlsx`}
            className="px-3.5 py-2.5 rounded-xl text-white font-extrabold text-[13px]"
            style={{ background: "#1e7145" }}
          >
            📊 Excel
          </a>
          <button
            onClick={() => setFormOpen(true)}
            className="px-4 py-2.5 rounded-xl brand-gradient text-white font-extrabold text-[13px]"
          >
            + Nueva asignación
          </button>
        </div>
      </div>

      {error && <p className="text-[#e0384a] text-[13px] font-bold mb-3">{error}</p>}

      {loaded && assignments.length === 0 && (
        <div className="bg-white rounded-[20px] border border-dashed border-[#d9d5f0] p-8 text-center text-sm text-[#a5a1bd]">
          Aún no hay asignaciones. Crea la primera con “+ Nueva asignación”.
        </div>
      )}

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        {assignments.map((a) => (
          <div key={a.id} className="bg-white rounded-[18px] border border-[#f0eefb] p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="font-extrabold text-[15px] leading-tight" style={{ fontFamily: "var(--font-nunito)" }}>
                {a.name}
              </div>
              <div className="flex gap-1 flex-none">
                <button onClick={() => setEditing(a)} title="Editar" className="text-sm px-1">
                  ✏️
                </button>
                <button onClick={() => remove(a)} title="Eliminar" className="text-sm px-1">
                  🗑️
                </button>
              </div>
            </div>
            <div className="text-[12px] font-bold text-[#a5a1bd] mb-2">📅 Entrega: {formatDate(a.dueDate)}</div>
            {a.description && <p className="text-[12.5px] text-[#57546e] mt-0 mb-2 line-clamp-2">{a.description}</p>}
            <div className="flex gap-1.5 flex-wrap text-[11px] font-extrabold mb-3">
              <span className="px-2 py-0.5 rounded-md bg-[#f2f0fd] text-[#6d5efc]" title={a.scaleName}>
                {describeScale({ type: a.scaleType, maxScore: a.maxScore, options: a.options })}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#eef7ff] text-[#2b7fd4]">Peso {formatNumber(a.weight)}</span>
              {a.rubric.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-[#fff5e6] text-[#e08a00]">
                  Rúbrica · {a.rubric.length} criterios · {formatNumber(rubricTotal(a.rubric))} pts
                </span>
              )}
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="flex-1 text-[12px] font-bold text-[#6b6880]">
                {a.gradedCount ?? 0}/{activeCount} calificados
              </div>
              <button
                onClick={() => setGrading(a.id)}
                className="px-3.5 py-2 rounded-xl bg-[#1a1830] text-white font-extrabold text-[12.5px]"
              >
                Calificar
              </button>
            </div>
          </div>
        ))}
      </div>

      {assignments.length > 0 && (
        <>
          <div className="font-extrabold text-[15px] mb-2.5" style={{ fontFamily: "var(--font-nunito)" }}>
            Libreta de calificaciones
          </div>
          <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#faf9ff] text-[11px] font-extrabold text-[#a5a1bd] uppercase tracking-wide">
                  <th className="text-left px-4 py-3 sticky left-0 bg-[#faf9ff] min-w-[180px]">Alumno</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="px-3 py-3 text-center min-w-[90px] normal-case" title={a.description}>
                      <button onClick={() => setGrading(a.id)} className="font-extrabold hover:text-[#6d5efc]">
                        {a.name}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center min-w-[90px]">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-t border-[#f4f2fc]" style={{ opacity: r.active ? 1 : 0.55 }}>
                    <td className="px-4 py-2.5 font-bold sticky left-0 bg-white">
                      {r.name}
                      {!r.active && <span className="text-[11px] text-[#a5a1bd]"> · removido</span>}
                    </td>
                    {r.cells.map((c, i) => (
                      <td
                        key={assignments[i].id}
                        className="px-3 py-2.5 text-center font-extrabold"
                        style={{ color: percentColor(c.percent) }}
                        title={c.comment || undefined}
                      >
                        {c.display ?? "—"}
                        {c.comment && <span className="text-[10px] align-super"> 💬</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center font-black" style={{ color: percentColor(r.average) }}>
                      {r.average == null ? "—" : formatNumber(Math.round(r.average * 10) / 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-[#a5a1bd] font-bold">
            Promedio ponderado sobre 100 de las asignaciones calificadas (según el peso de cada una).
          </p>
        </>
      )}

      {(formOpen || editing) && (
        <AssignmentFormModal
          subjectId={subjectId}
          initial={editing ?? undefined}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
