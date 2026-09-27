import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { classDatesInRange, weeklyMatrixForSubject, type DayCellStatus } from "@/lib/attendance";
import { safeFileName, tableDownload } from "@/lib/export";
import { MONTH_ABBR, mondayForOffset, todayMidnight, toDateOnly, weekdayDates } from "@/lib/week";

const STATUS_TEXT: Record<DayCellStatus, string> = {
  PRESENTE: "Presente",
  RETARDO: "Retardo",
  FALTA: "Falta",
  JUSTIFICADO: "Justificado",
  SIN_CLASE: "Sin clase",
};

/** Reporte de asistencia. `range=week` (por defecto, con `weekOffset`) o `range=all` para todo
 * el periodo desde que se creó la materia hasta hoy. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("TEACHER");
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const weekOffset = Number(searchParams.get("weekOffset") ?? "0");
    const range = searchParams.get("range") === "all" ? "all" : "week";
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    if (!subjectId) return NextResponse.json({ error: "Falta subjectId" }, { status: 400 });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    let dates: Date[];
    let fileBase: string;
    if (range === "all") {
      const today = todayMidnight();
      const scheduled = classDatesInRange(subject.weekdays, subject.createdAt, today);
      // incluye días fuera del horario en los que el maestro pasó lista
      const extra = await prisma.attendanceRecord.findMany({
        where: { subjectId, classDate: { lte: today } },
        distinct: ["classDate"],
        select: { classDate: true },
      });
      const byKey = new Map<string, Date>();
      for (const d of [...scheduled, ...extra.map((e) => e.classDate)]) byKey.set(toDateOnly(d), d);
      dates = [...byKey.values()].sort((a, b) => a.getTime() - b.getTime());
      fileBase = `asistencia_${safeFileName(subject.name)}_completo_${toDateOnly(today)}`;
    } else {
      const days = weekdayDates(mondayForOffset(weekOffset));
      dates = days.map((d) => d.date);
      fileBase = `reporte_${safeFileName(subject.name)}_${days[0].dnum}${days[0].mon}`;
    }

    const rows = dates.length ? await weeklyMatrixForSubject(subjectId, dates) : [];
    const DAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const header = [
      "Alumno",
      ...dates.map((d) => `${DAY[d.getDay()]} ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`),
      "Asistencias",
      "Retardos",
      "Faltas",
      "Justificadas",
      "% asistencia",
    ];
    const body = rows.map((r) => {
      const sessions = r.present + r.absent + r.justified;
      const rate = sessions === 0 ? "" : Math.round(((r.present + r.justified) / sessions) * 100);
      return [r.name, ...r.cells.map((c) => STATUS_TEXT[c]), r.present, r.late, r.absent, r.justified, rate];
    });

    return tableDownload(format, fileBase, [
      { name: "Asistencia", header, rows: body, widths: [28, ...dates.map(() => 13), 12, 10, 10, 12, 12] },
    ]);
  } catch (err) {
    return errorResponse(err);
  }
}
