"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ScanState = "idle" | "scanning" | "processing" | "success" | "error";

export default function EscanearPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ subjectName?: string; time?: string } | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const handleDecoded = useCallback(
    (token: string) => {
      stopCamera();
      setState("processing");
      setMessage("");

      if (!("geolocation" in navigator)) {
        setState("error");
        setMessage("Tu navegador no soporta geolocalización, necesaria para validar tu asistencia.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch("/api/attendance/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            });
            const json = await res.json();
            if (!res.ok) {
              setState("error");
              setMessage(json.error ?? "No se pudo registrar tu asistencia.");
              return;
            }
            if (json.ok) {
              setResult({ subjectName: json.subjectName, time: json.time });
              setState("success");
            } else {
              setState("error");
              setMessage(
                `Estás a ~${json.distanceM} m del aula (máximo ${json.radiusM} m). No se registró tu asistencia y se notificó al maestro.`,
              );
            }
          } catch {
            setState("error");
            setMessage("No se pudo conectar con el servidor.");
          }
        },
        () => {
          setState("error");
          setMessage("Activa el permiso de ubicación para registrar tu asistencia.");
        },
        { enableHighAccuracy: true, timeout: 12000 },
      );
    },
    [stopCamera],
  );

  const loopRef = useRef<() => void>(() => {});
  useEffect(() => {
    loopRef.current = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(() => loopRef.current());
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        handleDecoded(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(() => loopRef.current());
    };
  }, [handleDecoded]);

  async function startScan() {
    setMessage("");
    setResult(null);
    setState("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(() => loopRef.current());
    } catch {
      setState("error");
      setMessage("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
    }
  }

  const btnLabel =
    state === "scanning" ? "Escaneando…" : state === "processing" ? "Verificando…" : state === "idle" ? "Escanear QR" : "Escanear de nuevo";

  return (
    <div className="px-[22px] pt-3 pb-5">
      <div className="text-[21px] font-black mb-1" style={{ fontFamily: "var(--font-nunito)" }}>
        Escanear código
      </div>
      <p className="mt-0 mb-[18px] text-[#a5a1bd] text-[13px]">Apunta al QR que muestra tu maestro.</p>

      <div
        className="relative w-full aspect-square rounded-[26px] overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#2a2540,#1a1830)" }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: state === "scanning" ? 1 : 0 }}
        />
        <canvas ref={canvasRef} className="hidden" />

        <div
          className="absolute rounded-[18px] pointer-events-none"
          style={{ inset: 26, border: "2px dashed rgba(255,255,255,.25)" }}
        />
        <Corner style={{ top: 20, left: 20, borderTop: "4px solid #7dffd6", borderLeft: "4px solid #7dffd6", borderRadius: "10px 0 0 0" }} />
        <Corner style={{ top: 20, right: 20, borderTop: "4px solid #7dffd6", borderRight: "4px solid #7dffd6", borderRadius: "0 10px 0 0" }} />
        <Corner style={{ bottom: 20, left: 20, borderBottom: "4px solid #7dffd6", borderLeft: "4px solid #7dffd6", borderRadius: "0 0 0 10px" }} />
        <Corner style={{ bottom: 20, right: 20, borderBottom: "4px solid #7dffd6", borderRight: "4px solid #7dffd6", borderRadius: "0 0 10px 0" }} />

        {state === "idle" && (
          <div className="relative text-white/50 text-[13px] text-center px-[30px]">
            Presiona el botón para
            <br />
            activar la cámara
          </div>
        )}
        {state === "scanning" && (
          <div
            className="absolute h-[3px] animate-scanline"
            style={{
              left: 22,
              right: 22,
              background: "linear-gradient(90deg,transparent,#7dffd6,transparent)",
              boxShadow: "0 0 14px #7dffd6",
            }}
          />
        )}
        {state === "processing" && (
          <div className="relative text-white/70 text-[13px] text-center px-[30px] animate-pop">
            Verificando ubicación…
          </div>
        )}
        {state === "success" && (
          <div className="relative text-center animate-pop">
            <div
              className="w-[78px] h-[78px] rounded-full flex items-center justify-center text-[42px] mx-auto"
              style={{ background: "#17c0a4", boxShadow: "0 0 0 12px rgba(23,192,164,.2)" }}
            >
              ✓
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="relative text-center animate-pop">
            <div
              className="w-[78px] h-[78px] rounded-full flex items-center justify-center text-[40px] mx-auto"
              style={{ background: "#ff5c6c", boxShadow: "0 0 0 12px rgba(255,92,108,.2)" }}
            >
              📍
            </div>
          </div>
        )}
      </div>

      {state === "success" && result && (
        <div className="rounded-[18px] p-4 mt-4" style={{ background: "#e8faf5", border: "1.5px solid #b3ecdd" }}>
          <div className="font-black text-[#0d9b81] text-base mb-2.5">¡Asistencia registrada! 🎉</div>
          <div className="flex flex-col gap-2 text-[13px] text-[#0d6b5a]">
            <div className="flex justify-between">
              <span>Materia</span>
              <b>{result.subjectName}</b>
            </div>
            <div className="flex justify-between">
              <span>Hora de entrada</span>
              <b>{result.time}</b>
            </div>
            <div className="flex justify-between">
              <span>Ubicación</span>
              <b>✅ Dentro del aula</b>
            </div>
          </div>
        </div>
      )}
      {state === "error" && message && (
        <div className="rounded-[18px] p-4 mt-4" style={{ background: "#ffeef0", border: "1.5px solid #ffc9d0" }}>
          <div className="font-black text-[#e0384a] text-base mb-1.5">No se pudo registrar ⚠️</div>
          <p className="m-0 text-[13px] text-[#b3283a] leading-relaxed">{message}</p>
        </div>
      )}

      <button
        onClick={startScan}
        disabled={state === "scanning" || state === "processing"}
        className="w-full mt-4 py-[15px] rounded-[15px] text-white font-extrabold text-[15px] disabled:opacity-70"
        style={{ background: state === "scanning" || state === "processing" ? "#a5a1bd" : "#1a1830" }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function Corner({ style }: { style: React.CSSProperties }) {
  return <div className="absolute w-[34px] h-[34px] pointer-events-none" style={style} />;
}
