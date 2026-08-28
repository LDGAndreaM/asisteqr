"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QrModal from "@/components/teacher/QrModal";
import SubjectFormModal from "@/components/teacher/SubjectFormModal";

type Subject = {
  id: string;
  name: string;
  code: string;
  room: string;
  scheduleText: string;
  icon: string;
  tint: string;
  active: boolean;
  weekdays: number[];
  latitude: number | null;
  longitude: number | null;
};

type StudentRow = {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  institutionId: string | null;
  active: boolean;
  total: number;
  present: number;
  absent: number;
  justified: number;
  rate: number;
};

type PendingInvite = { id: string; email: string; createdAt: string };

type Summary = {
  total: number;
  avgRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalJustified: number;
};

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function SubjectDashboard({
  subject,
  students,
  pending,
  summary,
}: {
  subject: Subject;
  students: StudentRow[];
  pending: PendingInvite[];
  summary: Summary;
}) {
  const router = useRouter();
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstId, setEditInstId] = useState("");
  const [editError, setEditError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/subjects/${subject.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo invitar");
      setInviteMsg({
        text: json.enrolled
          ? "Alumno inscrito de inmediato (ya tenía cuenta)."
          : "Invitación enviada. Se activará cuando el alumno se registre.",
        ok: true,
      });
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      setInviteMsg({ text: err instanceof Error ? err.message : "No se pudo invitar", ok: false });
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvite(id: string) {
    setBusyId(id);
    await fetch(`/api/subjects/${subject.id}/invitations/${id}`, { method: "DELETE" });
    router.refresh();
    setBusyId(null);
  }

  async function toggleActive(studentId: string, active: boolean) {
    setBusyId(studentId);
    await fetch(`/api/subjects/${subject.id}/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    router.refresh();
    setBusyId(null);
  }

  function startEdit(s: StudentRow) {
    setEditingId(s.studentId);
    setEditName(s.name);
    setEditInstId(s.institutionId ?? "");
    setEditError("");
  }

  async function saveEdit(studentId: string) {
    setEditError("");
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, institutionId: editInstId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div>
      <Link href="/teacher/materias" className="text-[13px] font-bold text-[#6d5efc] mb-4 inline-block">
        ← Mis materias
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex gap-3.5 items-center">
          <div
            className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center text-[26px] flex-none"
            style={{ background: subject.tint }}
          >
            {subject.icon}
          </div>
          <div>
            <h1 className="m-0 text-[24px] font-black leading-tight" style={{ fontFamily: "var(--font-nunito)" }}>
              {subject.name} {!subject.active && <span className="text-sm text-[#a5a1bd] font-bold">(archivada)</span>}
            </h1>
            <div className="text-[13px] text-[#6b6880] font-bold mt-0.5">
              {subject.code} · 🕐 {subject.scheduleText} · 📍 {subject.room}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setEditOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-[13.5px]"
          >
            ✏️ Editar
          </button>
          {subject.active && (
            <button
              onClick={() => setQrOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#1a1830] text-white font-extrabold text-[13.5px]"
            >
              📷 Generar QR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <SummaryCard label="Alumnos" value={summary.total} color="#6d5efc" />
        <SummaryCard label="Asistencia prom." value={`${summary.avgRate}%`} color="#17c0a4" />
        <SummaryCard label="Total faltas" value={summary.totalAbsent} color="#ff5c6c" />
        <SummaryCard label="Total justif." value={summary.totalJustified} color="#ffb020" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] min-w-0">
        <div className="bg-white rounded-[20px] border border-[#f0eefb] overflow-hidden overflow-x-auto min-w-0">
          <div
            className="grid px-5 py-3.5 text-[11.5px] font-extrabold text-[#a5a1bd] uppercase tracking-wide"
            style={{ background: "#faf9ff", gridTemplateColumns: "2fr .8fr .8fr .8fr .8fr 1.3fr", minWidth: 620 }}
          >
            <div>Alumno</div>
            <div>Presente</div>
            <div>Falta</div>
            <div>Justif.</div>
            <div>%</div>
            <div>Acciones</div>
          </div>
          {students.map((s) => (
            <div
              key={s.studentId}
              className="grid px-5 py-3 items-center text-[13.5px] border-t border-[#f4f2fc]"
              style={{ gridTemplateColumns: "2fr .8fr .8fr .8fr .8fr 1.3fr", minWidth: 620, opacity: s.active ? 1 : 0.55 }}
            >
              {editingId === s.studentId ? (
                <div className="col-span-6 flex flex-wrap items-center gap-2 py-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                    placeholder="Nombre"
                  />
                  <input
                    value={editInstId}
                    onChange={(e) => setEditInstId(e.target.value)}
                    className="w-36 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                    placeholder="ID institución"
                  />
                  {editError && <p className="text-[#e0384a] text-xs font-bold w-full">{editError}</p>}
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#e7e4f5] text-[#6b6880] text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveEdit(s.studentId)}
                    className="px-3 py-1.5 rounded-lg bg-[#6d5efc] text-white text-xs font-bold"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11.5px] flex-none"
                      style={{ background: "#ede9ff", color: "#6d5efc" }}
                    >
                      {initialsOf(s.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{s.name}</div>
                      <div className="text-[11px] text-[#a5a1bd] truncate">
                        {s.email}
                        {!s.active && " · removido"}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-[#0d9b81]">{s.present}</div>
                  <div className="font-bold text-[#e0384a]">{s.absent}</div>
                  <div className="font-bold text-[#e08a00]">{s.justified}</div>
                  <div className="font-bold">{s.rate}%</div>
                  <div className="flex gap-2.5 flex-wrap">
                    <button onClick={() => startEdit(s)} className="text-[#6d5efc] font-bold text-xs">
                      Editar
                    </button>
                    {s.active ? (
                      <button
                        onClick={() => toggleActive(s.studentId, false)}
                        disabled={busyId === s.studentId}
                        className="text-[#e0384a] font-bold text-xs disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleActive(s.studentId, true)}
                        disabled={busyId === s.studentId}
                        className="text-[#0d9b81] font-bold text-xs disabled:opacity-50"
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {students.length === 0 && (
            <div className="px-5 py-6 text-sm text-[#a5a1bd]">Nadie inscrito todavía.</div>
          )}
        </div>

        <div className="bg-white rounded-[20px] border border-[#f0eefb] p-4 h-fit min-w-0">
          <div className="font-extrabold text-sm mb-3">Invitar por correo</div>
          <form onSubmit={onInvite} className="flex flex-col gap-2 mb-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="correo@institucion.mx"
              required
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2.5 rounded-xl brand-gradient text-white font-extrabold text-[13px] disabled:opacity-60"
            >
              {inviting ? "Invitando…" : "+ Invitar"}
            </button>
          </form>
          {inviteMsg && (
            <p className={`text-xs font-bold mb-3 ${inviteMsg.ok ? "text-[#0d9b81]" : "text-[#e0384a]"}`}>
              {inviteMsg.text}
            </p>
          )}

          {pending.length > 0 && (
            <div>
              <div className="text-[11px] font-extrabold text-[#a5a1bd] uppercase tracking-wide mb-1.5">
                Invitaciones pendientes
              </div>
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-sm border-t border-[#f4f2fc] first:border-t-0">
                  <span className="text-[#6b6880] truncate min-w-0" title={p.email}>
                    {p.email}
                  </span>
                  <button
                    onClick={() => cancelInvite(p.id)}
                    disabled={busyId === p.id}
                    className="text-[#e0384a] font-bold text-xs disabled:opacity-50 flex-none"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {qrOpen && <QrModal subjectId={subject.id} onClose={() => setQrOpen(false)} />}
      {editOpen && (
        <SubjectFormModal
          onClose={() => setEditOpen(false)}
          initial={subject}
          onSaved={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl px-[18px] py-4 border border-[#f0eefb]">
      <div className="text-[12px] text-[#a5a1bd] font-bold">{label}</div>
      <div className="text-[24px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
