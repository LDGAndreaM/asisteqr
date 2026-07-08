import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; invitationId: string }> },
) {
  try {
    const { id, invitationId } = await ctx.params;
    const user = await requireUser("TEACHER");

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { subject: true },
    });
    if (!invitation || invitation.subjectId !== id || invitation.subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
