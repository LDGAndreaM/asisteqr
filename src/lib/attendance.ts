import "server-only";
import { prisma } from "@/lib/prisma";
import { todayMidnight, isSameDay } from "@/lib/week";
import type { Subject } from "@/generated/prisma/client";

/** Fechas (00:00) en que la materia tiene clase, entre start y end (inclusive), según subject.weekdays (0=Lun..4=Vie). */
export function classDatesInRange(weekdays: number[], start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endMid = new Date(end);
  endMid.setHours(0, 0, 0, 0);
  while (cur <= endMid) {
    const day = cur.getDay(); // 0=Dom..6=Sáb
    const idx = day === 0 ? -1 : day - 1; // 0=Lun..4=Vie, -1/5/6 = fin de semana
    if (idx >= 0 && idx <= 4 && weekdays.includes(idx)) {
      dates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Días de clase transcurridos desde que se creó la materia hasta hoy (inclusive). */
export function sessionsSoFar(subject: Pick<Subject, "weekdays" | "createdAt">) {
  return classDatesInRange(subject.weekdays, subject.createdAt, todayMidnight()).length;
}

export type LiveRow = {
  studentId: string;
  name: string;
  institutionId: string | null;
  status: "PRESENTE" | "FALTA" | "JUSTIFICADO";
  time: string | null;
  locationStatus: "DENTRO" | "FUERA" | "NA";
};

/** Tabla de asistencia de HOY para una materia: todos los inscritos + su estado. */
export async function liveAttendanceForSubject(subjectId: string): Promise<LiveRow[]> {
  const today = todayMidnight();
  const [enrollments, records, justifications] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectId, active: true },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.attendanceRecord.findMany({ where: { subjectId, classDate: today } }),
    prisma.justification.findMany({
      where: { subjectId, status: "APROBADA", absenceDate: today },
    }),
  ]);

  const recordByStudent = new Map(records.map((r) => [r.studentId, r]));
  const justifiedStudents = new Set(justifications.map((j) => j.studentId));

  return enrollments.map(({ student }) => {
    const rec = recordByStudent.get(student.id);
    if (rec?.status === "PRESENTE") {
      return {
        studentId: student.id,
        name: student.name,
        institutionId: student.institutionId,
        status: "PRESENTE" as const,
        time: rec.scannedAt.toISOString().slice(11, 16),
        locationStatus: rec.locationStatus,
      };
    }
    if (justifiedStudents.has(student.id)) {
      return {
        studentId: student.id,
        name: student.name,
        institutionId: student.institutionId,
        status: "JUSTIFICADO" as const,
        time: null,
        locationStatus: "NA" as const,
      };
    }
    return {
      studentId: student.id,
      name: student.name,
      institutionId: student.institutionId,
      status: "FALTA" as const,
      time: null,
      locationStatus: rec?.locationStatus ?? "NA",
    };
  });
}

export type DayCellStatus = "PRESENTE" | "FALTA" | "JUSTIFICADO" | "SIN_CLASE";

/** Estado de un alumno en una materia para una fecha específica (para reportes semanales). */
export async function weeklyMatrixForSubject(subjectId: string, weekDates: Date[]) {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } });
  const today = todayMidnight();
  const minDate = weekDates[0];
  const maxDate = weekDates[weekDates.length - 1];

  const [activeEnrollments, records, justifications] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectId, active: true },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.attendanceRecord.findMany({
      where: { subjectId, classDate: { gte: minDate, lte: maxDate } },
      include: { student: true },
    }),
    prisma.justification.findMany({
      where: { subjectId, status: "APROBADA", absenceDate: { gte: minDate, lte: maxDate } },
      include: { student: true },
    }),
  ]);

  // Incluye también a alumnos ya removidos de la materia si tuvieron actividad
  // esa semana, para conservar el historial de asistencia pasado.
  const studentsById = new Map(activeEnrollments.map((e) => [e.student.id, e.student]));
  for (const r of records) studentsById.set(r.student.id, r.student);
  for (const j of justifications) studentsById.set(j.student.id, j.student);
  const roster = [...studentsById.values()].sort((a, b) => a.name.localeCompare(b.name));

  const rows = roster.map((student) => {
    const cells: DayCellStatus[] = weekDates.map((d) => {
      const day = d.getDay();
      const idx = day === 0 ? -1 : day - 1;
      const hasClass = idx >= 0 && idx <= 4 && subject.weekdays.includes(idx);
      if (!hasClass) return "SIN_CLASE";
      if (d > today) return "SIN_CLASE"; // aún no ocurre
      const rec = records.find((r) => r.studentId === student.id && isSameDay(r.classDate, d));
      if (rec?.status === "PRESENTE") return "PRESENTE";
      const justified = justifications.some(
        (j) => j.studentId === student.id && isSameDay(j.absenceDate, d),
      );
      if (justified) return "JUSTIFICADO";
      return "FALTA";
    });
    return {
      studentId: student.id,
      name: student.name,
      cells,
      present: cells.filter((c) => c === "PRESENTE").length,
      absent: cells.filter((c) => c === "FALTA").length,
      justified: cells.filter((c) => c === "JUSTIFICADO").length,
    };
  });

  return rows;
}

/** % de asistencia global de la materia (presentes+justificados / sesiones esperadas). */
export async function subjectAttendanceRate(subject: Subject) {
  const sessions = sessionsSoFar(subject);
  const enrolledCount = await prisma.enrollment.count({ where: { subjectId: subject.id, active: true } });
  const expected = sessions * enrolledCount;
  if (expected === 0) return 0;
  const [present, justified] = await Promise.all([
    prisma.attendanceRecord.count({ where: { subjectId: subject.id, status: "PRESENTE" } }),
    prisma.justification.count({ where: { subjectId: subject.id, status: "APROBADA" } }),
  ]);
  return Math.min(100, Math.round(((present + justified) / expected) * 100));
}

/** % de asistencia de UN alumno en una materia. */
export async function studentSubjectStats(subject: Subject, studentId: string) {
  const sessions = sessionsSoFar(subject);
  const [present, justified] = await Promise.all([
    prisma.attendanceRecord.count({
      where: { subjectId: subject.id, studentId, status: "PRESENTE" },
    }),
    prisma.justification.count({
      where: { subjectId: subject.id, studentId, status: "APROBADA" },
    }),
  ]);
  const absent = Math.max(0, sessions - present - justified);
  const rate = sessions === 0 ? 100 : Math.round(((present + justified) / sessions) * 100);
  return { total: sessions, present, justified, absent, rate };
}
