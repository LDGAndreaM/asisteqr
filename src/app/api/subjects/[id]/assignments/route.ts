import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { assignmentSchema } from "@/lib/validators";
import { getOwnedSubject, loadGradebook, serializeAssignment, withCriterionIds } from "@/lib/assignments";
import { parseDateOnly } from "@/lib/week";

/** Libreta de la materia: asignaciones + calificación de cada alumno + promedio ponderado. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    if (!(await getOwnedSubject(id, user.id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const { assignments, rows } = await loadGradebook(id);
    return NextResponse.json({
      assignments: assignments.map((a) => ({
        ...serializeAssignment(a),
        gradedCount: a.grades.filter((g) => g.score != null || g.optionCode != null).length,
      })),
      rows,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    if (!(await getOwnedSubject(id, user.id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const data = assignmentSchema.parse(await req.json());
    const assignment = await prisma.assignment.create({
      data: {
        subjectId: id,
        name: data.name,
        description: data.description,
        dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null,
        weight: data.weight,
        scaleName: data.scale.name,
        scaleType: data.scale.type,
        maxScore: data.scale.type === "NUMERIC" ? data.scale.maxScore : null,
        options: data.scale.type === "OPTIONS" ? data.scale.options : undefined,
        rubric: withCriterionIds(data.rubric),
      },
    });

    return NextResponse.json({ assignment: serializeAssignment(assignment) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
