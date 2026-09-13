"use client";

import { useEffect, useRef, useState } from "react";

type QrState = {
  qrDataUrl: string;
  secondsLeft: number;
  subject: { name: string; room: string; scheduleText: string };
} | null;

export default function QrModal({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [data, setData] = useState<QrState>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function runCapture() {
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
        setError("No se pudo obtener tu ubicación. Actívala para generar el código.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function retryCapture() {
    setError("");
    setLocating(true);
    setCoords(null);
    runCapture();
  }

  useEffect(() => {
    // Diferido a un microtask: la captura inicial no depende de props/estado de React
    // que deban sincronizarse en el mismo tick, así que no hay nada que hacer sincrónicamente aquí.
    queueMicrotask(runCapture);
  }, []);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/subjects/${subjectId}/qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: coords!.lat, longitude: coords!.lng }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "No se pudo generar el código");
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("No se pudo generar el código QR");
      }
    }
    tick();
    timer.current = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [subjectId, coords]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(20,14,50,.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[26px] p-[30px] w-full max-w-[430px] text-center animate-pop"
        style={{ boxShadow: "0 30px 70px rgba(20,14,50,.4)" }}
      >
        <div className="text-[13px] font-extrabold text-[#6d5efc] tracking-wide uppercase">
          {data?.subject.name ?? "Cargando…"}
        </div>
        <h2 className="mt-1 mb-1 text-[22px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
          Escanea para registrar
        </h2>
        <p className="mb-[18px] text-[#a5a1bd] text-[13px]">{data?.subject.room}</p>

        <div
          className="relative mx-auto p-4 bg-white rounded-[18px]"
          style={{ boxShadow: "0 0 0 3px #f0eefb", width: "min(300px,80vw)" }}
        >
          {data ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.qrDataUrl} alt="Código QR" className="block w-full h-auto mx-auto" />
          ) : (
            <div
              className="mx-auto flex items-center justify-center text-[#a5a1bd] text-sm px-4 text-center"
              style={{ aspectRatio: "1 / 1" }}
            >
              {locating ? "📍 Obteniendo tu ubicación…" : error || "Generando…"}
            </div>
          )}
        </div>

        {error && !locating && !data && (
          <button
            onClick={retryCapture}
            className="mt-4 px-4 py-2.5 rounded-xl bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-[13.5px]"
          >
            Reintentar
          </button>
        )}

        {data && (
          <>
            <div
              className="inline-flex items-center gap-2.5 mt-[18px] font-extrabold text-[13.5px] px-4 py-2.5 rounded-xl"
              style={{ background: "#fff5e6", color: "#ff9500" }}
            >
              <div
                className="w-[18px] h-[18px] rounded-full animate-spin-slow"
                style={{ border: "3px solid #ffd591", borderTopColor: "#ff9500" }}
              />
              El código se renueva en {data.secondsLeft}s
            </div>
            <div className="mt-2.5 text-[12px] font-bold text-[#0d9b81]">
              📍 Usando tu ubicación actual como centro de validación
            </div>
          </>
        )}

        <p className="mt-3.5 mb-0 text-[12.5px] text-[#a5a1bd] leading-relaxed">
          🔒 Cada código expira y cambia solo, así una foto reenviada deja de servir.
          <br />
          La app del alumno valida hora y ubicación al escanear.
        </p>
        <button
          onClick={onClose}
          className="mt-[18px] w-full py-[13px] rounded-[13px] bg-[#f2f0fd] text-[#6d5efc] font-extrabold text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
