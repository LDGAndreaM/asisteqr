import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentSubjectStats } from "@/lib/attendance";
import { todayMidnight } from "@/lib/week";
import JoinSubjectForm from "@/components/student/JoinSubjectForm";
import Link from "next/link";

export default async function StudentInicio() {
  const user = await getCurrentUser();
  if (!user) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id, active: true, subject: { active: true } },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const classDate = todayMidnight();
  const todayIdx = (() => {
    const d = new Date().getDay();
    return d === 0 ? -1 : d - 1;
  })();

  const todayRecords = await prisma.attendanceRecord.findMany({ where: { studentId: user.id, classDate } });
  const recordBySubject = new Map(todayRecords.map((r) => [r.subjectId, r]));

  const statsList = await Promise.all(
    enrollments.map(({ subject }) => studentSubjectStats(subject, user.id)),
  );
  const totalSessions = statsList.reduce((a, s) => a + s.total, 0);
  const totalGood = statsList.reduce((a, s) => a + s.present + s.justified, 0);
  const overallRate = totalSessions === 0 ? 100 : Math.round((totalGood / totalSessions) * 100);

  const todayClasses = enrollments
    .filter(({ subject }) => subject.weekdays.includes(todayIdx))
    .map(({ subject }) => {
      const rec = recordBySubject.get(subject.id);
      const registered = rec?.status === "PRESENTE";
      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        tint: subject.tint,
        room: subject.room,
        scheduleText: subject.scheduleText,
        registered,
        time: registered ? rec!.scannedAt.toISOString().slice(11, 16) : null,
      };
    });

  const firstName = user.name.split(" ")[0];

  return (
    <div className="px-[22px] pt-3 pb-5">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[13px] text-[#a5a1bd] font-bold">Hola, 👋</div>
          <div className="text-[22px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
            {firstName}
          </div>
        </div>
        <div
          className="w-11 h-11 rounded-full brand-gradient text-white flex items-center justify-center font-extrabold"
        >
          {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
      </div>

      <div
        className="rounded-[22px] p-5 text-white mb-[22px] brand-gradient"
        style={{ boxShadow: "0 14px 30px rgba(109,94,252,.4)" }}
      >
        <div className="text-[13px] opacity-85 font-bold">Tu asistencia global</div>
        <div className="flex items-end gap-2 my-1 mb-3">
          <span className="text-[40px] font-black leading-none">{overallRate}%</span>
          <span className="opacity-85 text-[13px] mb-1.5">este semestre</span>
        </div>
        <div className="h-2 rounded-lg bg-white/25 overflow-hidden">
          <div className="h-full bg-white rounded-lg" style={{ width: `${overallRate}%` }} />
        </div>
      </div>

      <div className="font-extrabold text-base mb-3" style={{ fontFamily: "var(--font-nunito)" }}>
        Clases de hoy
      </div>
      {todayClasses.map((c) => (
        <div
          key={c.id}
          className="bg-white rounded-[18px] p-[15px] mb-3 flex items-center gap-3.5"
          style={{ boxShadow: "0 3px 12px rgba(40,30,90,.06)" }}
        >
          <div
            className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center text-[21px] flex-none"
            style={{ background: c.tint }}
          >
            {c.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14.5px]">{c.name}</div>
            <div className="text-xs text-[#a5a1bd]">
              🕐 {c.scheduleText} · {c.room}
            </div>
          </div>
          <span
            className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap"
            style={
              c.registered
                ? { background: "#e8faf5", color: "#0d9b81" }
                : { background: "#f2f0fd", color: "#8b86b8" }
            }
          >
            {c.registered ? `✓ Registrada ${c.time}` : "Pendiente"}
          </span>
        </div>
      ))}
      {todayClasses.length === 0 && (
        <p className="text-sm text-[#a5a1bd] mb-3">No tienes clases programadas hoy.</p>
      )}

      <Link
        href="/student/escanear"
        className="w-full mt-2 py-[15px] rounded-2xl bg-[#1a1830] text-white font-extrabold text-[15px] flex items-center justify-center gap-2.5"
      >
        📷 Escanear QR ahora
      </Link>

      <JoinSubjectForm />
    </div>
  );
}
