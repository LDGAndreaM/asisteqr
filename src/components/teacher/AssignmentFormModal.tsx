"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PRESET_RUBRICS,
  PRESET_SCALES,
  describeScale,
  formatNumber,
  type AssignmentDTO,
  type GradeScale,
  type RubricTemplateDTO,
  type SavedScaleDTO,
} from "@/lib/grading";

type CriterionDraft = { id?: string; title: string; description: string; points: string };
type OptionDraft = { code: string; label: string; value: string };

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-[#e7e4f5] text-sm outline-none bg-white";
const labelCls = "block text-[12.5px] font-extrabold text-[#6b6880] mb-1.5";

function toDraft(c: { id?: string; title: string; description: string; points: number }): CriterionDraft {
  return { id: c.id, title: c.title, description: c.description, points: String(c.points) };
}

/** Crear / editar una asignación: datos generales, escala de calificación y rúbrica. */
export default function AssignmentFormModal({
  subjectId,
  initial,
  onClose,
  onSaved,
}: {
  subjectId: string;
  initial?: AssignmentDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [weight, setWeight] = useState(String(initial?.weight ?? 1));

  // escala: "preset:<key>" | "saved:<id>" | "current" (la que ya tiene la asignación) | "custom"
  const [scaleKey, setScaleKey] = useState(isEdit ? "current" : "preset:p100");
  const [savedScales, setSavedScales] = useState<SavedScaleDTO[]>([]);
  const [customType, setCustomType] = useState<"NUMERIC" | "OPTIONS">("OPTIONS");
  const [customName, setCustomName] = useState("");
  const [customMax, setCustomMax] = useState("20");
  const [customOptions, setCustomOptions] = useState<OptionDraft[]>([
    { code: "1", label: "Entregó", value: "1" },
    { code: "R", label: "Retardo", value: "0.5" },
    { code: "0", label: "No entregó", value: "0" },
  ]);
  const [saveScale, setSaveScale] = useState(true);

  const [criteria, setCriteria] = useState<CriterionDraft[]>((initial?.rubric ?? []).map(toDraft));
  const [templates, setTemplates] = useState<RubricTemplateDTO[]>([]);
  const [templatePick, setTemplatePick] = useState("");
  const [tplMsg, setTplMsg] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/subjects/${subjectId}/grading-scales`).then((r) => r.json()),
      fetch(`/api/rubric-templates`).then((r) => r.json()),
    ]).then(([s, t]) => {
      if (cancelled) return;
      setSavedScales(s.scales ?? []);
      setTemplates(t.templates ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  function customScale(): GradeScale {
    if (customType === "NUMERIC") {
      const max = Number(customMax);
      return { name: customName.trim() || `Sobre ${customMax}`, type: "NUMERIC", maxScore: max };
    }
    return {
      name: customName.trim() || customOptions.map((o) => o.code).join(" / "),
      type: "OPTIONS",
      options: customOptions.map((o) => ({ code: o.code.trim(), label: o.label.trim(), value: Number(o.value) })),
    };
  }

  function selectedScale(): GradeScale | null {
    if (scaleKey === "current" && initial) {
      return initial.scaleType === "NUMERIC"
        ? { name: initial.scaleName, type: "NUMERIC", maxScore: initial.maxScore ?? 100 }
        : { name: initial.scaleName, type: "OPTIONS", options: initial.options };
    }
    if (scaleKey.startsWith("preset:")) {
      const p = PRESET_SCALES.find((x) => `preset:${x.key}` === scaleKey);
      if (!p) return null;
      return p.type === "NUMERIC"
        ? { name: p.name, type: "NUMERIC", maxScore: p.maxScore }
        : { name: p.name, type: "OPTIONS", options: p.options };
    }
    if (scaleKey.startsWith("saved:")) {
      const s = savedScales.find((x) => `saved:${x.id}` === scaleKey);
      if (!s) return null;
      return s.type === "NUMERIC"
        ? { name: s.name, type: "NUMERIC", maxScore: s.maxScore ?? 100 }
        : { name: s.name, type: "OPTIONS", options: s.options };
    }
    return customScale();
  }

  function applyTemplate() {
    if (!templatePick) return;
    const src = templatePick.startsWith("preset:")
      ? PRESET_RUBRICS.find((r) => `preset:${r.key}` === templatePick)?.criteria
      : templates.find((t) => `tpl:${t.id}` === templatePick)?.criteria;
    if (!src) return;
    if (criteria.length > 0 && !confirm("¿Reemplazar los criterios actuales por los de esta rúbrica?")) return;
    setCriteria(src.map((c) => toDraft(c)));
    setTemplatePick("");
  }

  async function saveTemplate() {
    setTplMsg("");
    const tplName = prompt("Nombre para guardar esta rúbrica:", name ? `Rúbrica ${name}` : "");
    if (!tplName) return;
    const res = await fetch("/api/rubric-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tplName,
        criteria: criteria.map((c) => ({ title: c.title, description: c.description, points: Number(c.points) || 0 })),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setTplMsg(json.error ?? "No se pudo guardar la plantilla");
      return;
    }
    setTemplates((prev) => [...prev, json.template]);
    setTplMsg("Rúbrica guardada en tus plantillas");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("¿Eliminar esta plantilla de rúbrica?")) return;
    await fetch(`/api/rubric-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setTemplatePick("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const scale = selectedScale();
    if (!scale) {
      setError("Selecciona una escala de calificación");
      return;
    }
    setSaving(true);
    try {
      if (scaleKey === "custom" && saveScale) {
        const res = await fetch(`/api/subjects/${subjectId}/grading-scales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scale),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Escala inválida");
      }

      const body = {
        name,
        description,
        dueDate: dueDate || null,
        weight: Number(weight),
        scale,
        rubric: criteria.map((c) => ({
          ...(c.id && { id: c.id }),
          title: c.title,
          description: c.description,
          points: Number(c.points) || 0,
        })),
      };
      const res = await fetch(
        isEdit ? `/api/subjects/${subjectId}/assignments/${initial!.id}` : `/api/subjects/${subjectId}/assignments`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar la asignación");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la asignación");
    } finally {
      setSaving(false);
    }
  }

  const total = criteria.reduce((a, c) => a + (Number(c.points) || 0), 0);
  const preview = selectedScale();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(20,14,50,.55)", backdropFilter: "blur(4px)" }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="bg-white rounded-[24px] p-7 w-full max-w-[640px] animate-pop max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: "0 30px 70px rgba(20,14,50,.4)" }}
      >
        <h2 className="mt-0 mb-4 text-[22px] font-black" style={{ fontFamily: "var(--font-nunito)" }}>
          {isEdit ? "Editar asignación" : "Nueva asignación"}
        </h2>

        <label className={labelCls}>Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Tarea 3 — Derivadas"
          required
          className={`${inputCls} mb-3`}
        />

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className={labelCls}>Fecha de entrega</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div className="w-[130px]">
            <label className={labelCls} title="Cuánto pesa en el promedio de la materia">
              Peso en promedio
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>

        <label className={labelCls}>Descripción breve</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Instrucciones o notas de la asignación"
          className={`${inputCls} mb-4 resize-y`}
        />

        {/* ---------- Escala ---------- */}
        <div className="rounded-2xl border border-[#f0eefb] bg-[#faf9ff] p-4 mb-4">
          <label className={labelCls}>¿Cómo se califica?</label>
          <select value={scaleKey} onChange={(e) => setScaleKey(e.target.value)} className={`${inputCls} mb-2`}>
            {isEdit && <option value="current">Actual: {initial!.scaleName}</option>}
            <optgroup label="Predefinidas">
              {PRESET_SCALES.map((p) => (
                <option key={p.key} value={`preset:${p.key}`}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            {savedScales.length > 0 && (
              <optgroup label="Guardadas en esta materia">
                {savedScales.map((s) => (
                  <option key={s.id} value={`saved:${s.id}`}>
                    {s.name} ({describeScale(s)})
                  </option>
                ))}
              </optgroup>
            )}
            <option value="custom">✏️ Personalizada…</option>
          </select>

          {scaleKey === "custom" && (
            <div className="bg-white rounded-xl border border-[#e7e4f5] p-3 mb-2">
              <div className="flex gap-2 mb-2.5">
                {(["NUMERIC", "OPTIONS"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCustomType(t)}
                    className="flex-1 py-2 rounded-lg font-extrabold text-[12.5px] border-[1.5px]"
                    style={
                      customType === t
                        ? { background: "#6d5efc", borderColor: "#6d5efc", color: "#fff" }
                        : { background: "#fff", borderColor: "#e7e4f5", color: "#6b6880" }
                    }
                  >
                    {t === "NUMERIC" ? "Numérica (0 a N)" : "Opciones (1 / R / 0 …)"}
                  </button>
                ))}
              </div>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nombre de la escala (opcional)"
                className={`${inputCls} mb-2.5`}
              />
              {customType === "NUMERIC" ? (
                <label className="flex items-center gap-2 text-[13px] font-bold text-[#6b6880]">
                  Calificación máxima
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    value={customMax}
                    onChange={(e) => setCustomMax(e.target.value)}
                    className="w-24 px-3 py-2 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                  />
                </label>
              ) : (
                <div>
                  <div className="grid grid-cols-[70px_1fr_80px_28px] gap-1.5 text-[11px] font-extrabold text-[#a5a1bd] uppercase mb-1">
                    <div>Código</div>
                    <div>Significado</div>
                    <div title="Valor numérico para el promedio">Valor</div>
                    <div />
                  </div>
                  {customOptions.map((o, i) => (
                    <div key={i} className="grid grid-cols-[70px_1fr_80px_28px] gap-1.5 mb-1.5">
                      <input
                        value={o.code}
                        maxLength={4}
                        onChange={(e) =>
                          setCustomOptions((prev) => prev.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))
                        }
                        required
                        className="px-2 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm font-black text-center"
                      />
                      <input
                        value={o.label}
                        onChange={(e) =>
                          setCustomOptions((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                        }
                        className="px-2 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                      />
                      <input
                        type="number"
                        step="any"
                        value={o.value}
                        onChange={(e) =>
                          setCustomOptions((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                        }
                        required
                        className="px-2 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomOptions((prev) => prev.filter((_, j) => j !== i))}
                        className="text-[#e0384a] font-black"
                        title="Quitar opción"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomOptions((prev) => [...prev, { code: "", label: "", value: "0" }])}
                    className="text-[12.5px] font-extrabold text-[#6d5efc]"
                  >
                    + Agregar opción
                  </button>
                  <p className="text-[11.5px] text-[#a5a1bd] mt-1.5 mb-0">
                    El valor sirve para el promedio: la opción con mayor valor equivale a 100.
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2 mt-2.5 text-[12.5px] font-bold text-[#6b6880]">
                <input
                  type="checkbox"
                  checked={saveScale}
                  onChange={(e) => setSaveScale(e.target.checked)}
                  className="accent-[#6d5efc]"
                />
                Guardar esta escala en la materia para reutilizarla
              </label>
            </div>
          )}

          {preview && (
            <div className="text-[12px] font-bold text-[#6b6880]">
              Valores:{" "}
              {preview.type === "NUMERIC"
                ? `de 0 a ${formatNumber(preview.maxScore)}`
                : preview.options.map((o) => `${o.code}${o.label ? ` = ${o.label}` : ""}`).join(" · ")}
            </div>
          )}
        </div>

        {/* ---------- Rúbrica ---------- */}
        <div className="rounded-2xl border border-[#f0eefb] bg-[#faf9ff] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={`${labelCls} mb-0`}>Rúbrica (opcional)</label>
            {criteria.length > 0 && (
              <span className="text-[12px] font-extrabold text-[#6d5efc]">Total: {formatNumber(total)} pts</span>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            <select value={templatePick} onChange={(e) => setTemplatePick(e.target.value)} className={inputCls}>
              <option value="">Elegir una rúbrica prediseñada…</option>
              <optgroup label="Predefinidas">
                {PRESET_RUBRICS.map((r) => (
                  <option key={r.key} value={`preset:${r.key}`}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              {templates.length > 0 && (
                <optgroup label="Mis rúbricas guardadas">
                  {templates.map((t) => (
                    <option key={t.id} value={`tpl:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              onClick={applyTemplate}
              disabled={!templatePick}
              className="px-4 rounded-xl bg-[#6d5efc] text-white font-extrabold text-[13px] disabled:opacity-40"
            >
              Usar
            </button>
            {templatePick.startsWith("tpl:") && (
              <button
                type="button"
                onClick={() => deleteTemplate(templatePick.slice(4))}
                title="Eliminar plantilla"
                className="px-3 rounded-xl bg-[#ffeef0] text-[#e0384a] font-extrabold text-[13px]"
              >
                🗑️
              </button>
            )}
          </div>

          {criteria.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e7e4f5] p-2.5 mb-2">
              <div className="flex gap-2 mb-1.5">
                <input
                  value={c.title}
                  onChange={(e) => setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  placeholder="Criterio"
                  required
                  className="flex-1 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm font-bold"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={c.points}
                  onChange={(e) => setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)))}
                  required
                  title="Puntos"
                  className="w-20 px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-sm"
                />
                <span className="self-center text-[12px] font-bold text-[#a5a1bd]">pts</span>
                <button
                  type="button"
                  onClick={() => setCriteria((prev) => prev.filter((_, j) => j !== i))}
                  className="text-[#e0384a] font-black px-1"
                  title="Quitar criterio"
                >
                  ×
                </button>
              </div>
              <input
                value={c.description}
                onChange={(e) =>
                  setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                }
                placeholder="Descripción (qué se espera)"
                className="w-full px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#e7e4f5] text-[12.5px]"
              />
            </div>
          ))}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setCriteria((prev) => [...prev, { title: "", description: "", points: "10" }])}
              className="text-[12.5px] font-extrabold text-[#6d5efc]"
            >
              + Agregar criterio manualmente
            </button>
            {criteria.length > 0 && (
              <button type="button" onClick={saveTemplate} className="text-[12.5px] font-extrabold text-[#0d9b81]">
                💾 Guardar como plantilla
              </button>
            )}
            {tplMsg && <span className="text-[12px] font-bold text-[#6b6880]">{tplMsg}</span>}
          </div>
        </div>

        {error && <p className="text-[#e0384a] text-[13px] font-bold text-center mb-3">{error}</p>}

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
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear asignación"}
          </button>
        </div>
      </form>
    </div>
  );
}
