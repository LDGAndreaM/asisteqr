import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AsistenciasView from "@/components/teacher/AsistenciasView";

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { subject } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: { teacherId: user.id, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, icon: true },
  });

  const initialSubjectId = subjects.find((s) => s.id === subject)?.id ?? subjects[0]?.id ?? null;

  return <AsistenciasView subjects={subjects} initialSubjectId={initialSubjectId} />;
}
