import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { uniqueJoinCode } from "@/lib/join-code";

/** Genera un nuevo código de unión (el anterior deja de funcionar). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: { joinCode: await uniqueJoinCode() },
    });
    return NextResponse.json({ joinCode: updated.joinCode });
  } catch (err) {
    return errorResponse(err);
  }
}
