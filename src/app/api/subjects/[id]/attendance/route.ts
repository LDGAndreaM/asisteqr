import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { liveAttendanceForSubject } from "@/lib/attendance";
import { manualAttendanceSchema } from "@/lib/validators";
import { parseDateOnly, todayMidnight, toDateOnly } from "@/lib/week";

async function ownedSubject(id: string, teacherId: string) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  return subject && subject.teacherId === teacherId ? subject : null;
}

/** Lista de asistencia de la materia para ?date=YYYY-MM-DD (hoy si no se indica). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    if (!(await ownedSubject(id, user.id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const dateParam = req.nextUrl.searchParams.get("date");
    const classDate = dateParam ? parseDateOnly(dateParam) : todayMidnight();
    const rows = await liveAttendanceForSubject(id, classDate);

    return NextResponse.json({
      date: toDateOnly(classDate),
      rows,
      stats: {
        present: rows.filter((r) => r.status === "PRESENTE").length,
        late: rows.filter((r) => r.status === "RETARDO").length,
        absent: rows.filter((r) => r.status === "FALTA").length,
        justified: rows.filter((r) => r.status === "JUSTIFICADO").length,
        outside: rows.filter((r) => r.locationStatus === "FUERA").length,
        unrecorded: rows.filter((r) => !r.recorded && r.status === "FALTA").length,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Pase de lista manual: guarda el estado de uno o varios alumnos para una fecha. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await ownedSubject(id, user.id);
    if (!subject) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const { date, entries } = manualAttendanceSchema.parse(await req.json());
    const classDate = parseDateOnly(date);
    if (classDate > todayMidnight()) {
      return NextResponse.json({ error: "No puedes pasar lista de una fecha futura" }, { status: 400 });
    }

    const enrolled = await prisma.enrollment.findMany({
      where: { subjectId: id, studentId: { in: entries.map((e) => e.studentId) } },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));
    const unknown = entries.find((e) => !enrolledIds.has(e.studentId));
    if (unknown) {
      return NextResponse.json({ error: "Uno de los alumnos no está inscrito en la materia" }, { status: 400 });
    }

    const now = new Date();
    await prisma.$transaction(
      entries.map(({ studentId, status }) => {
        const where = { subjectId_studentId_classDate: { subjectId: id, studentId, classDate } };
        if (status === null) return prisma.attendanceRecord.deleteMany({ where: { subjectId: id, studentId, classDate } });
        return prisma.attendanceRecord.upsert({
          where,
          create: { subjectId: id, studentId, classDate, scannedAt: now, status, source: "MANUAL" },
          // conserva hora/ubicación del escaneo si existía; solo cambia el estado
          update: { status, source: "MANUAL" },
        });
      }),
    );

    return NextResponse.json({ ok: true, saved: entries.length });
  } catch (err) {
    return errorResponse(err);
  }
}
