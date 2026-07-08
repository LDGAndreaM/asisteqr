"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/student", icon: "🏠", label: "Inicio" },
  { href: "/student/asistencia", icon: "📊", label: "Asistencia" },
];

export default function StudentTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className="flex-none flex justify-around items-center px-2 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] bg-white border-t border-[#f0eefb] sticky bottom-0"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-1"
            style={{ color: active ? "#6d5efc" : "#b7b3d0" }}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-[10px] font-extrabold">{t.label}</span>
          </Link>
        );
      })}

      <Link
        href="/student/escanear"
        className="w-[60px] h-[60px] rounded-full brand-gradient text-white flex items-center justify-center text-2xl -mt-7 border-4 border-white"
        style={{ boxShadow: "0 10px 22px rgba(109,94,252,.45)" }}
      >
        📷
      </Link>

      <Link
        href="/student/justificar"
        className="flex-1 flex flex-col items-center gap-0.5 py-1"
        style={{ color: pathname === "/student/justificar" ? "#6d5efc" : "#b7b3d0" }}
      >
        <span className="text-xl">📄</span>
        <span className="text-[10px] font-extrabold">Justificar</span>
      </Link>

      <button onClick={logout} className="flex-1 flex flex-col items-center gap-0.5 py-1 text-[#b7b3d0]">
        <span className="text-xl">↩️</span>
        <span className="text-[10px] font-extrabold">Salir</span>
      </button>
    </div>
  );
}
