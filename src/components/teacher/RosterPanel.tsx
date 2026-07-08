"use client";

import { useEffect, useState, type FormEvent } from "react";

type StudentRow = {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  institutionId: string | null;
  active: boolean;
};
type PendingInvite = { id: string; email: string; createdAt: string };

export default function RosterPanel({ subjectId }: { subjectId: string }) {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstId, setEditInstId] = useState("");
  const [editError, setEditError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/subjects/${subjectId}/roster`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setStudents(json.students);
    setPending(json.pending);
  }

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      const res = await fetch(`/api/subjects/${subjectId}/roster`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (cancelled) return;
      setStudents(json.students);
      setPending(json.pending);
    }
    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo invitar");
      setInviteMsg({
        text: json.enrolled ? "Alumno inscrito de inmediato (ya tenía cuenta)." : "Invitación enviada. Se activará cuando el alumno se registre.",
        ok: true,
      });
      setInviteEmail("");
      load();
    } catch (err) {
      setInviteMsg({ text: err instanceof Error ? err.message : "No se pudo invitar", ok: false });
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvite(id: string) {
    setBusyId(id);
    await fetch(`/api/subjects/${subjectId}/invitations/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  async function toggleActive(studentId: string, active: boolean) {
    setBusyId(studentId);
    await fetch(`/api/subjects/${subjectId}/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
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
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div className="mt-3 bg-[#faf9ff] rounded-2xl p-4 border border-[#f0eefb]">
      <form onSubmit={onInvite} className="flex gap-2 mb-4">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="correo@institucion.mx"
          required
          className="flex-1 px-3 py-2.5 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm outline-none bg-white"
        />
        <button
          type="submit"
          disabled={inviting}
          className="px-4 py-2.5 rounded-xl brand-gradient text-white font-extrabold text-[13px] disabled:opacity-60 whitespace-nowrap"
        >
          {inviting ? "Invitando…" : "+ Invitar"}
        </button>
      </form>
      {inviteMsg && (
        <p className={`text-xs font-bold mb-3 -mt-2 ${inviteMsg.ok ? "text-[#0d9b81]" : "text-[#e0384a]"}`}>
          {inviteMsg.text}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-extrabold text-[#a5a1bd] uppercase tracking-wide mb-1.5">
            Invitaciones pendientes
          </div>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-[#6b6880]">{p.email}</span>
              <button
                onClick={() => cancelInvite(p.id)}
                disabled={busyId === p.id}
                className="text-[#e0384a] font-bold text-xs disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] font-extrabold text-[#a5a1bd] uppercase tracking-wide mb-1.5">
        Alumnos ({students?.filter((s) => s.active).length ?? 0})
      </div>
      {students === null && <p className="text-sm text-[#a5a1bd]">Cargando…</p>}
      {students?.map((s) => (
        <div key={s.studentId} className="py-2 border-t border-[#f0eefb] first:border-t-0">
          {editingId === s.studentId ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm bg-white"
                  placeholder="Nombre"
                />
                <input
                  value={editInstId}
                  onChange={(e) => setEditInstId(e.target.value)}
                  className="w-36 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm bg-white"
                  placeholder="ID institución"
                />
              </div>
              {editError && <p className="text-[#e0384a] text-xs font-bold">{editError}</p>}
              <div className="flex gap-2">
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
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className={s.active ? "" : "opacity-50"}>
                <div className="font-bold text-sm">{s.name}</div>
                <div className="text-xs text-[#a5a1bd]">
                  {s.email} {s.institutionId ? `· ${s.institutionId}` : ""}
                  {!s.active && " · removido"}
                </div>
              </div>
              <div className="flex gap-2 flex-none">
                <button
                  onClick={() => startEdit(s)}
                  className="text-[#6d5efc] font-bold text-xs"
                >
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
            </div>
          )}
        </div>
      ))}
      {students?.length === 0 && pending.length === 0 && (
        <p className="text-sm text-[#a5a1bd]">Nadie inscrito todavía. Invita por correo o comparte la clave.</p>
      )}
    </div>
  );
}
