import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStudentSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await ctx.params;
    const user = await requireUser("TEACHER");
    const data = updateStudentSchema.parse(await req.json());

    const sharesSubject = await prisma.enrollment.findFirst({
      where: { studentId, subject: { teacherId: user.id } },
    });
    if (!sharesSubject) {
      return NextResponse.json({ error: "No tienes permiso sobre este alumno" }, { status: 403 });
    }

    if (data.institutionId) {
      const clash = await prisma.user.findUnique({ where: { institutionId: data.institutionId } });
      if (clash && clash.id !== studentId) {
        return NextResponse.json({ error: "Ese ID de institución ya está en uso" }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.institutionId !== undefined && { institutionId: data.institutionId }),
      },
    });

    return NextResponse.json({
      student: { id: updated.id, name: updated.name, institutionId: updated.institutionId },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
