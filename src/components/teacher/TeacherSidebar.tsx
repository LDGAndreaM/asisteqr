"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/teacher/materias", label: "Materias", icon: "📚" },
  { href: "/teacher/asistencias", label: "Asistencias", icon: "✅" },
  { href: "/teacher/justificaciones", label: "Justificaciones", icon: "📄" },
  { href: "/teacher/reportes", label: "Reportes", icon: "📈" },
];

export default function TeacherSidebar({
  teacherName,
  teacherEmail,
  pendingCount,
}: {
  teacherName: string;
  teacherEmail: string;
  pendingCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = teacherName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[250px] flex-none bg-white border-r border-[#ecebf5] px-4 py-[22px] flex flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
          <Logo size={24} />
        </div>
        <div>
          <div className="font-black text-[17px] leading-none" style={{ fontFamily: "var(--font-nunito)" }}>
            AsisteQR
          </div>
          <div className="text-[11px] text-[#a5a1bd]">Panel del maestro</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 mt-2">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-xl font-extrabold text-sm"
              style={active ? { background: "#f2f0fd", color: "#6d5efc" } : { color: "#6b6880" }}
            >
              <span className="text-[17px]">{item.icon}</span> {item.label}
              {item.href === "/teacher/justificaciones" && pendingCount > 0 && (
                <span className="ml-auto bg-[#ff5c9d] text-white text-[11px] font-extrabold rounded-full px-2 py-px">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#ecebf5] pt-3.5 flex items-center gap-2.5">
        <div className="w-[38px] h-[38px] rounded-full bg-[#ffe1d6] text-[#ff7a59] flex items-center justify-center font-extrabold">
          {initials}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="font-bold text-[13.5px] truncate">{teacherName}</div>
          <div className="text-[11px] text-[#a5a1bd] truncate">{teacherEmail}</div>
        </div>
        <button
          onClick={logout}
          title="Salir"
          className="bg-[#f4f3ff] rounded-[10px] p-2 text-[15px]"
        >
          ↩
        </button>
      </div>
    </aside>
  );
}
