import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") redirect("/login");

  const pendingCount = await prisma.justification.count({
    where: { subject: { teacherId: user.id }, status: "PENDIENTE" },
  });

  return (
    <div className="flex min-h-screen" style={{ background: "#f4f3ff" }}>
      <TeacherSidebar teacherName={user.name} teacherEmail={user.email} pendingCount={pendingCount} />
      <main className="flex-1 min-w-0 px-8 py-7 max-w-[1120px]">{children}</main>
    </div>
  );
}
