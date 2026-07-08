import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectAttendanceRate } from "@/lib/attendance";
import MateriasView from "@/components/teacher/MateriasView";

export default async function MateriasPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const subjects = await prisma.subject.findMany({
    where: { teacherId: user.id },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { enrollments: { where: { active: true } } } } },
  });

  const data = await Promise.all(
    subjects.map(async (s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      room: s.room,
      scheduleText: s.scheduleText,
      icon: s.icon,
      tint: s.tint,
      weekdays: s.weekdays,
      latitude: s.latitude,
      longitude: s.longitude,
      active: s.active,
      students: s._count.enrollments,
      rate: await subjectAttendanceRate(s),
    })),
  );

  return <MateriasView initialSubjects={data} />;
}
