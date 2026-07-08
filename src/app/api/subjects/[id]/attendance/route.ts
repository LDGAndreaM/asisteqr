import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { liveAttendanceForSubject } from "@/lib/attendance";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const rows = await liveAttendanceForSubject(id);

    return NextResponse.json({
      rows,
      stats: {
        present: rows.filter((r) => r.status === "PRESENTE").length,
        absent: rows.filter((r) => r.status === "FALTA").length,
        justified: rows.filter((r) => r.status === "JUSTIFICADO").length,
        outside: rows.filter((r) => r.locationStatus === "FUERA").length,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
