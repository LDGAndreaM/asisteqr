"use client";

import { useState, type FormEvent } from "react";
import type { Subject } from "@/components/teacher/MateriasView";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie"];

type Initial = {
  id: string;
  name: string;
  code: string;
  room: string;
  scheduleText: string;
  weekdays: number[];
  latitude: number | null;
  longitude: number | null;
};

export default function SubjectFormModal({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void;
  onSaved: (s: Subject) => void;
  initial?: Initial;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [room, setRoom] = useState(initial?.room ?? "");
  const [scheduleText, setScheduleText] = useState(initial?.scheduleText ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleDay(i: number) {
    setWeekdays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));
  }

  function useMyLocation() {
    setError("");
    setLocating(true);
    if (!("geolocation" in navigator)) {
      setError("Este navegador no soporta geolocalización");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación. Revisa los permisos del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (weekdays.length === 0) {
      setError("Selecciona al menos un día de clase");
      return;
    }
    if (!coords) {
      setError("Captura la ubicación del salón antes de guardar la materia");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        code,
        room,
        scheduleText,
        weekdays,
        latitude: coords.lat,
        longitude: coords.lng,
      };
      const res = await fetch(isEdit ? `/api/subjects/${initial!.id}` : "/api/subjects", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar la materia");
      onSaved(json.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la materia");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(20,14,50,.55)", backdropFilter: "blur(4px)" }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="bg-white rounded-[24px] p-7 w-full max-w-[460px] animate-pop max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 30px 70px rgba(20,14,50,.4)" }}
      >
        <h2 className="mt-0 mb-1 text-[22px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
          {isEdit ? "Editar materia" : "Nueva materia"}
        </h2>
        <p className="mt-0 mb-5 text-[#a5a1bd] text-[13.5px]">Define el nombre, clave, horario y el salón.</p>

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Nombre de la materia</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Estructuras de Datos"
          required
          className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 outline-none"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Clave</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="EDD-210"
              required
              className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Aula</label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Lab 2"
              required
              className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 outline-none"
            />
          </div>
        </div>

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Horario</label>
        <input
          value={scheduleText}
          onChange={(e) => setScheduleText(e.target.value)}
          placeholder="Ej. Mar · Jue 09:00–10:30"
          required
          className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm mb-3.5 outline-none"
        />

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">Días de clase</label>
        <div className="flex gap-2 mb-4">
          {WEEKDAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              className="flex-1 py-2 rounded-lg font-extrabold text-[12.5px] border-[1.5px]"
              style={
                weekdays.includes(i)
                  ? { background: "#6d5efc", borderColor: "#6d5efc", color: "#fff" }
                  : { background: "#fff", borderColor: "#e7e4f5", color: "#6b6880" }
              }
            >
              {d}
            </button>
          ))}
        </div>

        <label className="block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5">
          Ubicación del salón (para validar asistencia)
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="w-full mb-5 px-3.5 py-3 rounded-xl border-[1.5px] text-sm font-bold flex items-center justify-center gap-2"
          style={
            coords
              ? { borderColor: "#b3ecdd", background: "#f0fcf8", color: "#0d9b81" }
              : { borderColor: "#e7e4f5", background: "#faf9ff", color: "#6b6880" }
          }
        >
          {locating
            ? "Ubicando…"
            : coords
            ? `📍 Ubicación capturada (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) — toca para recapturar`
            : "📍 Usar mi ubicación actual"}
        </button>

        {error && <p className="text-[#e0384a] text-[13px] font-bold text-center mb-3.5 -mt-2">{error}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-[13px] rounded-xl bg-[#f4f3ff] text-[#6b6880] font-extrabold text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] py-[13px] rounded-xl brand-gradient text-white font-extrabold text-sm disabled:opacity-60"
          >
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear materia"}
          </button>
        </div>
      </form>
    </div>
  );
}
