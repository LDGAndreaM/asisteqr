import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentSubjectStats } from "@/lib/attendance";

export default async function StudentAsistenciaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id, active: true, subject: { active: true } },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  const cards = await Promise.all(
    enrollments.map(async ({ subject }) => {
      const stats = await studentSubjectStats(subject, user.id);
      const color = stats.rate >= 90 ? "#17c0a4" : stats.rate >= 80 ? "#ffb020" : "#ff5c6c";
      return { subject, ...stats, color };
    }),
  );

  return (
    <div className="px-[22px] pt-3 pb-5">
      <div className="text-[21px] font-black mb-3.5" style={{ fontFamily: "var(--font-nunito)" }}>
        Mi asistencia
      </div>
      {cards.map(({ subject, present, absent, justified, total, rate, color }) => (
        <div
          key={subject.id}
          className="bg-white rounded-[18px] p-4 mb-3.5"
          style={{ boxShadow: "0 3px 12px rgba(40,30,90,.06)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl"
              style={{ background: subject.tint }}
            >
              {subject.icon}
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-[14.5px]">{subject.name}</div>
              <div className="text-xs text-[#a5a1bd]">
                {present + justified} de {total} sesiones
              </div>
            </div>
            <div className="text-[19px] font-black" style={{ color }}>
              {rate}%
            </div>
          </div>
          <div className="h-2 rounded-lg bg-[#f0eefb] overflow-hidden">
            <div className="h-full rounded-lg" style={{ width: `${rate}%`, background: color }} />
          </div>
          <div className="flex gap-2 mt-[11px] text-[11.5px] flex-wrap">
            <span className="bg-[#e8faf5] text-[#0d9b81] font-bold px-2.5 py-1 rounded-lg">
              ✓ {present} presente
            </span>
            <span className="bg-[#ffeef0] text-[#e0384a] font-bold px-2.5 py-1 rounded-lg">
              ✕ {absent} falta
            </span>
            {justified > 0 && (
              <span className="bg-[#fff5e6] text-[#e08a00] font-bold px-2.5 py-1 rounded-lg">
                ◐ {justified} justif.
              </span>
            )}
          </div>
        </div>
      ))}
      {cards.length === 0 && (
        <p className="text-sm text-[#a5a1bd]">No estás inscrito en ninguna materia todavía.</p>
      )}
    </div>
  );
}
