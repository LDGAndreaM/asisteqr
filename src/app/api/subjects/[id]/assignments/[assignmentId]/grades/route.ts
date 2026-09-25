import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { errorResponse } from "@/lib/api";
import { saveGradesSchema } from "@/lib/validators";
import { getOwnedAssignment, loadAssignmentGrades } from "@/lib/assignments";
import { asOptions, asRubric } from "@/lib/grading";

type Ctx = { params: Promise<{ id: string; assignmentId: string }> };

/** Guarda las calificaciones de uno o varios alumnos. Una entrada sin calificación, sin
 * puntos de rúbrica y sin comentario borra la calificación de ese alumno. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id, assignmentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const assignment = await getOwnedAssignment(id, assignmentId, user.id);
    if (!assignment) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

    const { grades } = saveGradesSchema.parse(await req.json());

    const enrolled = await prisma.enrollment.findMany({
      where: { subjectId: id, studentId: { in: grades.map((g) => g.studentId) } },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));

    const options = asOptions(assignment.options);
    const rubric = asRubric(assignment.rubric);
    const ops = [];

    for (const g of grades) {
      if (!enrolledIds.has(g.studentId)) {
        return NextResponse.json({ error: "Uno de los alumnos no está inscrito en la materia" }, { status: 400 });
      }

      let score: number | null = null;
      let optionCode: string | null = null;
      if (assignment.scaleType === "NUMERIC") {
        score = g.score ?? null;
        if (score != null && (score < 0 || score > (assignment.maxScore ?? 100))) {
          return NextResponse.json(
            { error: `La calificación debe estar entre 0 y ${assignment.maxScore}` },
            { status: 400 },
          );
        }
      } else if (g.optionCode) {
        const opt = options.find((o) => o.code.toUpperCase() === g.optionCode!.toUpperCase());
        if (!opt) {
          return NextResponse.json(
            { error: `"${g.optionCode}" no es una opción válida (${options.map((o) => o.code).join(", ")})` },
            { status: 400 },
          );
        }
        optionCode = opt.code;
      }

      let rubricScores: Record<string, number> | null = null;
      if (g.rubricScores && Object.keys(g.rubricScores).length > 0) {
        rubricScores = {};
        for (const [criterionId, pts] of Object.entries(g.rubricScores)) {
          const c = rubric.find((x) => x.id === criterionId);
          if (!c) continue; // criterio eliminado de la rúbrica
          if (pts > c.points) {
            return NextResponse.json(
              { error: `"${c.title}" vale máximo ${c.points} puntos` },
              { status: 400 },
            );
          }
          rubricScores[criterionId] = pts;
        }
      }

      const comment = g.comment?.trim() ?? "";
      const where = { assignmentId_studentId: { assignmentId, studentId: g.studentId } };

      if (score == null && optionCode == null && !rubricScores && !comment) {
        ops.push(prisma.grade.deleteMany({ where: { assignmentId, studentId: g.studentId } }));
        continue;
      }
      const data = {
        score,
        optionCode,
        rubricScores: rubricScores ?? Prisma.DbNull,
        comment,
        gradedAt: new Date(),
      };
      ops.push(
        prisma.grade.upsert({
          where,
          create: { assignmentId, studentId: g.studentId, ...data },
          update: data,
        }),
      );
    }

    await prisma.$transaction(ops);
    return NextResponse.json(await loadAssignmentGrades(assignmentId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
