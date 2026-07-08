import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { studentSubjectStats } from "@/lib/attendance";
import { todayMidnight } from "@/lib/week";

export async function GET() {
  try {
    const user = await requireUser("STUDENT");

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.id, active: true, subject: { active: true } },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    });

    const classDate = todayMidnight();
    const todayIdx = (() => {
      const d = new Date().getDay();
      return d === 0 ? -1 : d - 1;
    })();

    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: user.id, classDate },
    });
    const recordBySubject = new Map(todayRecords.map((r) => [r.subjectId, r]));

    const bySubject = await Promise.all(
      enrollments.map(async ({ subject }) => {
        const stats = await studentSubjectStats(subject, user.id);
        return {
          subjectId: subject.id,
          name: subject.name,
          icon: subject.icon,
          tint: subject.tint,
          ...stats,
        };
      }),
    );

    const today = enrollments
      .filter(({ subject }) => subject.weekdays.includes(todayIdx))
      .map(({ subject }) => {
        const rec = recordBySubject.get(subject.id);
        return {
          subjectId: subject.id,
          name: subject.name,
          icon: subject.icon,
          tint: subject.tint,
          room: subject.room,
          scheduleText: subject.scheduleText,
          registered: rec?.status === "PRESENTE",
          time: rec?.status === "PRESENTE" ? rec.scannedAt.toISOString().slice(11, 16) : null,
        };
      });

    const totalSessions = bySubject.reduce((a, s) => a + s.total, 0);
    const totalGood = bySubject.reduce((a, s) => a + s.present + s.justified, 0);
    const overallRate = totalSessions === 0 ? 100 : Math.round((totalGood / totalSessions) * 100);

    return NextResponse.json({ today, bySubject, overallRate });
  } catch (err) {
    return errorResponse(err);
  }
}
