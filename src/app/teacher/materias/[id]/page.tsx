import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentSubjectStats } from "@/lib/attendance";
import SubjectDashboard from "@/components/teacher/SubjectDashboard";

export default async function SubjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject || subject.teacherId !== user.id) notFound();

  const [enrollments, pendingInvites] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subjectId: id },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.invitation.findMany({
      where: { subjectId: id, claimedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const students = await Promise.all(
    enrollments.map(async (e) => {
      const stats = await studentSubjectStats(subject, e.studentId);
      return {
        enrollmentId: e.id,
        studentId: e.studentId,
        name: e.student.name,
        email: e.student.email,
        institutionId: e.student.institutionId,
        active: e.active,
        ...stats,
      };
    }),
  );

  const activeStudents = students.filter((s) => s.active);
  const summary = {
    total: activeStudents.length,
    avgRate:
      activeStudents.length === 0
        ? 0
        : Math.round(activeStudents.reduce((a, s) => a + s.rate, 0) / activeStudents.length),
    totalPresent: activeStudents.reduce((a, s) => a + s.present, 0),
    totalAbsent: activeStudents.reduce((a, s) => a + s.absent, 0),
    totalJustified: activeStudents.reduce((a, s) => a + s.justified, 0),
  };

  return (
    <SubjectDashboard
      subject={{
        id: subject.id,
        name: subject.name,
        code: subject.code,
        room: subject.room,
        scheduleText: subject.scheduleText,
        icon: subject.icon,
        tint: subject.tint,
        active: subject.active,
        weekdays: subject.weekdays,
      }}
      students={students}
      pending={pendingInvites.map((i) => ({
        id: i.id,
        email: i.email,
        createdAt: i.createdAt.toISOString(),
      }))}
      summary={summary}
    />
  );
}
