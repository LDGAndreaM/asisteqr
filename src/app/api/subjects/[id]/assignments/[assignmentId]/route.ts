import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { errorResponse } from "@/lib/api";
import { updateAssignmentSchema } from "@/lib/validators";
import {
  getOwnedAssignment,
  loadAssignmentGrades,
  serializeAssignment,
  withCriterionIds,
} from "@/lib/assignments";
import { parseDateOnly } from "@/lib/week";

type Ctx = { params: Promise<{ id: string; assignmentId: string }> };

/** Una asignación con la lista de alumnos y sus calificaciones. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, assignmentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const assignment = await getOwnedAssignment(id, assignmentId, user.id);
    if (!assignment) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

    const { students, grades } = await loadAssignmentGrades(assignmentId, id);
    return NextResponse.json({ assignment: serializeAssignment(assignment), students, grades });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, assignmentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const assignment = await getOwnedAssignment(id, assignmentId, user.id);
    if (!assignment) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

    const data = updateAssignmentSchema.parse(await req.json());

    if (data.scale) {
      const s = data.scale;
      const sameScale =
        s.type === assignment.scaleType &&
        (s.type === "NUMERIC"
          ? s.maxScore === assignment.maxScore
          : JSON.stringify(s.options) === JSON.stringify(assignment.options));
      if (!sameScale) {
        const graded = await prisma.grade.count({ where: { assignmentId } });
        if (graded > 0) {
          return NextResponse.json(
            { error: "No puedes cambiar la escala de una asignación que ya tiene calificaciones" },
            { status: 400 },
          );
        }
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.rubric !== undefined && { rubric: withCriterionIds(data.rubric) }),
        ...(data.scale && {
          scaleName: data.scale.name,
          scaleType: data.scale.type,
          maxScore: data.scale.type === "NUMERIC" ? data.scale.maxScore : null,
          options: data.scale.type === "OPTIONS" ? data.scale.options : Prisma.DbNull,
        }),
      },
    });

    return NextResponse.json({ assignment: serializeAssignment(updated) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, assignmentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const assignment = await getOwnedAssignment(id, assignmentId, user.id);
    if (!assignment) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
