import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewJustificationSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const body = reviewJustificationSchema.parse(await req.json());

    const justification = await prisma.justification.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!justification || justification.subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Justificación no encontrada" }, { status: 404 });
    }

    const absenceDate = body.absenceDate ? new Date(body.absenceDate) : justification.absenceDate;
    absenceDate.setHours(0, 0, 0, 0);

    const updated = await prisma.justification.update({
      where: { id },
      data: {
        status: body.action === "approve" ? "APROBADA" : "RECHAZADA",
        absenceDate,
        reviewedAt: new Date(),
        reviewerId: user.id,
      },
    });

    return NextResponse.json({ justification: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
