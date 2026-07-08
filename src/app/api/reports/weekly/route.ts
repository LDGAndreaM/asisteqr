import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { weeklyMatrixForSubject } from "@/lib/attendance";
import { mondayForOffset, weekdayDates } from "@/lib/week";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("TEACHER");
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const weekOffset = Number(searchParams.get("weekOffset") ?? "0");

    if (!subjectId) return NextResponse.json({ error: "Falta subjectId" }, { status: 400 });

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const monday = mondayForOffset(weekOffset);
    const days = weekdayDates(monday);
    const rows = await weeklyMatrixForSubject(subjectId, days.map((d) => d.date));

    return NextResponse.json({
      days: days.map((d) => ({ short: d.short, dnum: d.dnum, mon: d.mon })),
      weekLabel: `${days[0].dnum} ${days[0].mon} – ${days[4].dnum} ${days[4].mon} ${days[4].date.getFullYear()}`,
      canGoNext: weekOffset < 0,
      rows,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
