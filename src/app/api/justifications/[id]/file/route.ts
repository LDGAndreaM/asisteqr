import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { readJustificationFile } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();

    const justification = await prisma.justification.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!justification) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    const isOwner = justification.studentId === user.id;
    const isTeacher = justification.subject.teacherId === user.id;
    if (!isOwner && !isTeacher) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const bytes = await readJustificationFile(justification.filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(justification.fileName)}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
