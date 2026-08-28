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
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: "#f4f3ff" }}>
      <TeacherSidebar teacherName={user.name} teacherEmail={user.email} pendingCount={pendingCount} />
      <main className="flex-1 min-w-0 px-4 py-5 pb-24 md:px-8 md:py-7 md:pb-7 max-w-[1120px]">{children}</main>
    </div>
  );
}
