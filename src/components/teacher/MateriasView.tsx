"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import QrModal from "@/components/teacher/QrModal";
import SubjectFormModal from "@/components/teacher/SubjectFormModal";
import RosterPanel from "@/components/teacher/RosterPanel";
import DeleteSubjectModal from "@/components/teacher/DeleteSubjectModal";

export type Subject = {
  id: string;
  name: string;
  code: string;
  room: string;
  scheduleText: string;
  icon: string;
  tint: string;
  weekdays: number[];
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  students: number;
  rate: number;
};

export default function MateriasView({ initialSubjects }: { initialSubjects: Subject[] }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [qrSubject, setQrSubject] = useState<Subject | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [rosterOpenId, setRosterOpenId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);

  const active = subjects.filter((s) => s.active);
  const archived = subjects.filter((s) => !s.active);
  const visible = showArchived ? archived : active;

  async function toggleArchive(s: Subject) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/subjects/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !s.active }),
      });
      const json = await res.json();
      if (res.ok) {
        setSubjects((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: json.subject.active } : x)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[22px] gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[27px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
            Mis materias
          </h1>
          <p className="mt-1 mb-0 text-[#6b6880] text-sm">
            Crea materias, define horarios y genera el código QR cuando lo necesites.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-[13px] font-bold text-[#6d5efc] underline whitespace-nowrap"
          >
            {showArchived ? "Ver activas" : `Ver archivadas (${archived.length})`}
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="px-[18px] py-3 rounded-[13px] brand-gradient text-white font-extrabold text-sm shadow-[0_10px_20px_rgba(109,94,252,.35)] whitespace-nowrap"
          >
            + Nueva materia
          </button>
        </div>
      </div>

      <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {visible.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-[20px] p-5 border border-[#f0eefb]"
            style={{ boxShadow: "0 4px 18px rgba(40,30,90,.06)", opacity: s.active ? 1 : 0.7 }}
          >
            <div className="flex items-start justify-between mb-3.5">
              <div className="flex gap-3 items-center">
                <div
                  className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center text-[22px]"
                  style={{ background: s.tint }}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="font-extrabold text-[16.5px] leading-tight" style={{ fontFamily: "var(--font-nunito)" }}>
                    {s.name} {!s.active && <span className="text-xs text-[#a5a1bd] font-bold">(archivada)</span>}
                  </div>
                  <div className="text-xs text-[#a5a1bd] font-bold tracking-wide">{s.code}</div>
                </div>
              </div>
              <button
                onClick={() => setEditSubject(s)}
                title="Editar materia"
                className="text-[#a5a1bd] hover:text-[#6d5efc] text-sm font-bold px-1.5"
              >
                ✏️
              </button>
            </div>
            <div className="flex flex-col gap-[7px] text-[13px] text-[#57546e] mb-4">
              <div className="flex gap-2 items-center">🕐 <span>{s.scheduleText}</span></div>
              <div className="flex gap-2 items-center">📍 <span>{s.room}</span></div>
              <div className="flex gap-2 items-center">
                👥{" "}
                <button
                  onClick={() => setRosterOpenId(rosterOpenId === s.id ? null : s.id)}
                  className="text-[#6d5efc] font-bold underline"
                >
                  {s.students} alumnos inscritos
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex-1 h-2 rounded-lg bg-[#f0eefb] overflow-hidden">
                <div
                  className="h-full rounded-lg"
                  style={{ width: `${s.rate}%`, background: "linear-gradient(90deg,#17c0a4,#3fd8b5)" }}
                />
              </div>
              <div className="text-[12.5px] font-extrabold text-[#17c0a4]">{s.rate}%</div>
            </div>
            <div className="flex gap-2.5">
              {s.active ? (
                <>
                  <button
                    onClick={() => setQrSubject(s)}
                    className="flex-1 py-[11px] rounded-xl bg-[#1a1830] text-white font-extrabold text-[13.5px] flex items-center justify-center gap-1.5"
                  >
                    📷 Generar QR
                  </button>
                  <button
                    onClick={() => router.push(`/teacher/asistencias?subject=${s.id}`)}
                    className="px-3.5 py-[11px] rounded-xl bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-[13.5px]"
                  >
                    Asistencia
                  </button>
                  <button
                    onClick={() => toggleArchive(s)}
                    disabled={busyId === s.id}
                    className="px-3.5 py-[11px] rounded-xl bg-[#fff5e6] text-[#e08a00] font-extrabold text-[13.5px] disabled:opacity-50"
                  >
                    🗄️
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => toggleArchive(s)}
                    disabled={busyId === s.id}
                    className="flex-1 py-[11px] rounded-xl bg-[#17c0a4] text-white font-extrabold text-[13.5px] disabled:opacity-50"
                  >
                    Reactivar materia
                  </button>
                  <button
                    onClick={() => setDeleteSubject(s)}
                    title="Eliminar permanentemente"
                    className="px-3.5 py-[11px] rounded-xl bg-[#ffeef0] text-[#e0384a] font-extrabold text-[13.5px]"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>

            {rosterOpenId === s.id && <RosterPanel subjectId={s.id} />}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-[#a5a1bd] text-sm">
            {showArchived ? "No hay materias archivadas." : "Aún no tienes materias. Crea la primera con “+ Nueva materia”."}
          </p>
        )}
      </div>

      {qrSubject && <QrModal subjectId={qrSubject.id} onClose={() => setQrSubject(null)} />}
      {formOpen && (
        <SubjectFormModal
          onClose={() => setFormOpen(false)}
          onSaved={(s) => {
            setSubjects((prev) => [...prev, { ...s, active: true, students: 0, rate: 0 }]);
            setFormOpen(false);
          }}
        />
      )}
      {editSubject && (
        <SubjectFormModal
          onClose={() => setEditSubject(null)}
          initial={editSubject}
          onSaved={(s) => {
            setSubjects((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)));
            setEditSubject(null);
          }}
        />
      )}
      {deleteSubject && (
        <DeleteSubjectModal
          subjectId={deleteSubject.id}
          subjectName={deleteSubject.name}
          onClose={() => setDeleteSubject(null)}
          onDeleted={() => {
            setSubjects((prev) => prev.filter((x) => x.id !== deleteSubject.id));
            setDeleteSubject(null);
          }}
        />
      )}
    </div>
  );
}
