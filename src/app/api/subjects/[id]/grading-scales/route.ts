import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { gradeScaleSchema } from "@/lib/validators";
import { getOwnedSubject } from "@/lib/assignments";
import { asOptions } from "@/lib/grading";
import type { GradingScale } from "@/generated/prisma/client";

function serialize(s: GradingScale) {
  return { id: s.id, name: s.name, type: s.type, maxScore: s.maxScore, options: asOptions(s.options) };
}

/** Escalas de calificación personalizadas guardadas en la materia. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    if (!(await getOwnedSubject(id, user.id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const scales = await prisma.gradingScale.findMany({ where: { subjectId: id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ scales: scales.map(serialize) });
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
    const data = gradeScaleSchema.parse(await req.json());
    const scale = await prisma.gradingScale.create({
      data: {
        subjectId: id,
        name: data.name,
        type: data.type,
        maxScore: data.type === "NUMERIC" ? data.maxScore : null,
        options: data.type === "OPTIONS" ? data.options : undefined,
      },
    });
    return NextResponse.json({ scale: serialize(scale) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
