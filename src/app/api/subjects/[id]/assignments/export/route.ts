import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { getOwnedSubject, loadGradebook } from "@/lib/assignments";
import { asOptions, asRubric, describeScale, formatNumber, rubricTotal } from "@/lib/grading";
import { safeFileName, tableDownload } from "@/lib/export";
import { toDateOnly } from "@/lib/week";

/** Reporte de calificaciones: alumnos × asignaciones + promedio ponderado (0–100). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await getOwnedSubject(id, user.id);
    if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    const { assignments, rows } = await loadGradebook(id);

    const header = [
      "Alumno",
      "ID institución",
      "Correo",
      ...assignments.map((a) => `${a.name} (${describeScale({ type: a.scaleType, maxScore: a.maxScore, options: asOptions(a.options) })})`),
      "Promedio (0-100)",
    ];
    const gradeRows = rows.map((r) => [
      r.name + (r.active ? "" : " (removido)"),
      r.institutionId ?? "",
      r.email,
      ...r.cells.map((c) => c.display ?? ""),
      r.average == null ? "" : Number(r.average.toFixed(1)),
    ]);

    const detailRows = assignments.map((a) => {
      const rubric = asRubric(a.rubric);
      return [
        a.name,
        a.dueDate ? toDateOnly(a.dueDate) : "",
        a.description,
        a.scaleName,
        describeScale({ type: a.scaleType, maxScore: a.maxScore, options: asOptions(a.options) }),
        a.weight,
        rubric.length
          ? rubric.map((c) => `${c.title} (${formatNumber(c.points)})`).join("; ") + ` — total ${formatNumber(rubricTotal(rubric))}`
          : "",
      ];
    });

    const commentRows = rows.flatMap((r) =>
      r.cells
        .map((c, i) => (c.comment ? [r.name, assignments[i].name, c.display ?? "", c.comment] : null))
        .filter((x): x is string[] => x !== null),
    );

    return tableDownload(format, `calificaciones_${safeFileName(subject.name)}_${toDateOnly(new Date())}`, [
      {
        name: "Calificaciones",
        header,
        rows: gradeRows,
        widths: [28, 16, 28, ...assignments.map(() => 18), 16],
      },
      {
        name: "Asignaciones",
        header: ["Asignación", "Fecha de entrega", "Descripción", "Escala", "Valores", "Peso", "Rúbrica"],
        rows: detailRows,
        widths: [28, 16, 40, 28, 18, 8, 60],
      },
      {
        name: "Comentarios",
        header: ["Alumno", "Asignación", "Calificación", "Comentario"],
        rows: commentRows,
        widths: [28, 28, 14, 60],
      },
    ]);
  } catch (err) {
    return errorResponse(err);
  }
}
