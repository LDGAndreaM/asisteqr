import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JustificacionesView from "@/components/teacher/JustificacionesView";

export default async function JustificacionesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const justifications = await prisma.justification.findMany({
    where: { subject: { teacherId: user.id } },
    include: { student: true, subject: true },
    orderBy: { createdAt: "desc" },
  });

  const data = justifications.map((j) => ({
    id: j.id,
    name: j.student.name,
    subjectName: j.subject.name,
    absenceDate: j.absenceDate.toISOString().slice(0, 10),
    reason: j.reason,
    fileName: j.fileName,
    status: j.status,
  }));

  return <JustificacionesView initialJustifications={data} />;
}
