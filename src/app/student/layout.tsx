import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import StudentTabBar from "@/components/student/StudentTabBar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  return (
    <div className="min-h-screen flex justify-center" style={{ background: "#f6f5ff" }}>
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#f6f5ff]">
        <div className="flex-1 overflow-y-auto pb-2">{children}</div>
        <StudentTabBar />
      </div>
    </div>
  );
}
