import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollmentStatusSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; studentId: string }> },
) {
  try {
    const { id, studentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const { active } = enrollmentStatusSchema.parse(await req.json());

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.update({
      where: { subjectId_studentId: { subjectId: id, studentId } },
      data: { active },
    });

    return NextResponse.json({ enrollment });
  } catch (err) {
    return errorResponse(err);
  }
}
