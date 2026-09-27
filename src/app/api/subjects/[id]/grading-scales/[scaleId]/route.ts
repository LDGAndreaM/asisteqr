import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { getOwnedSubject } from "@/lib/assignments";

/** Borra una escala guardada. Las asignaciones que la usaron conservan su copia. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; scaleId: string }> }) {
  try {
    const { id, scaleId } = await ctx.params;
    const user = await requireUser("TEACHER");
    if (!(await getOwnedSubject(id, user.id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    await prisma.gradingScale.deleteMany({ where: { id: scaleId, subjectId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
