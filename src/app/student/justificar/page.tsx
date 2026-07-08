import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JustificarForm from "@/components/student/JustificarForm";

export default async function JustificarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id, active: true, subject: { active: true } },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const subjects = enrollments.map((e) => ({ id: e.subject.id, name: e.subject.name }));

  return <JustificarForm subjects={subjects} />;
}
