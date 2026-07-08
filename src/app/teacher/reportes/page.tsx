import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReportesView from "@/components/teacher/ReportesView";

export default async function ReportesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const subjects = await prisma.subject.findMany({
    where: { teacherId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, icon: true },
  });

  return <ReportesView subjects={subjects} />;
}
