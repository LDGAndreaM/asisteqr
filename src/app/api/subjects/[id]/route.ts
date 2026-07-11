import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSubjectSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";
import { deleteJustificationFile } from "@/lib/uploads";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const data = updateSubjectSchema.parse(await req.json());

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    if (data.code && data.code !== subject.code) {
      const clash = await prisma.subject.findUnique({
        where: { teacherId_code: { teacherId: user.id, code: data.code } },
      });
      if (clash) {
        return NextResponse.json({ error: "Ya tienes una materia con esa clave" }, { status: 409 });
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.room !== undefined && { room: data.room }),
        ...(data.scheduleText !== undefined && { scheduleText: data.scheduleText }),
        ...(data.weekdays !== undefined && { weekdays: data.weekdays }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json({ subject: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Borra permanentemente una materia archivada, junto con su historial (asistencias,
 * justificaciones, inscripciones e invitaciones). Solo se permite si ya está archivada,
 * para evitar borrar por accidente una materia en uso. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    if (subject.active) {
      return NextResponse.json(
        { error: "Archiva la materia antes de eliminarla definitivamente" },
        { status: 400 },
      );
    }

    const justifications = await prisma.justification.findMany({
      where: { subjectId: id },
      select: { filePath: true },
    });

    await prisma.subject.delete({ where: { id } });

    await Promise.all(justifications.map((j) => deleteJustificationFile(j.filePath)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
