"use client";

import { useState } from "react";
import AttendanceSheet from "@/components/teacher/AttendanceSheet";

export default function AsistenciasView({
  subjects,
  initialSubjectId,
}: {
  subjects: { id: string; name: string; icon: string }[];
  initialSubjectId: string | null;
}) {
  const [activeId, setActiveId] = useState(initialSubjectId);

  if (!activeId) {
    return <p className="text-[#6b6880] text-sm">Crea una materia primero en “Materias”.</p>;
  }

  return (
    <div>
      <h1 className="m-0 mb-1.5 text-[27px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
        Asistencias
      </h1>
      <p className="mt-0 mb-[18px] text-[#6b6880] text-sm">
        Los escaneos QR llegan en tiempo real; también puedes pasar lista a mano alumno por alumno.
      </p>

      <div className="flex gap-2.5 flex-wrap mb-5">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className="px-[15px] py-[9px] rounded-xl font-extrabold text-[13px] border-[1.5px]"
            style={
              activeId === s.id
                ? { borderColor: "#6d5efc", background: "#6d5efc", color: "#fff" }
                : { borderColor: "#e7e4f5", background: "#fff", color: "#6b6880" }
            }
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      <AttendanceSheet key={activeId} subjectId={activeId} />
    </div>
  );
}
