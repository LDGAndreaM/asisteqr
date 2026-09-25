// Escalas de calificación y rúbricas. Se usa tanto en el servidor como en el cliente.

export type GradeOption = {
  /** Lo que se captura y se muestra en la tabla (ej. "1", "R", "NE"). */
  code: string;
  /** Descripción (ej. "Entregó con retardo"). */
  label: string;
  /** Valor numérico para promedios. */
  value: number;
};

export type GradeScale =
  | { name: string; type: "NUMERIC"; maxScore: number; options?: null }
  | { name: string; type: "OPTIONS"; maxScore?: null; options: GradeOption[] };

export const PRESET_SCALES: (GradeScale & { key: string })[] = [
  { key: "p100", name: "Sobre 100", type: "NUMERIC", maxScore: 100 },
  { key: "p10", name: "Sobre 10", type: "NUMERIC", maxScore: 10 },
  {
    key: "entrega",
    name: "Entregó (1) / No entregó (0)",
    type: "OPTIONS",
    options: [
      { code: "1", label: "Entregó", value: 1 },
      { code: "0", label: "No entregó", value: 0 },
    ],
  },
  {
    key: "entrega-retardo",
    name: "Entregó (1) / Retardo (R) / No entregó (0)",
    type: "OPTIONS",
    options: [
      { code: "1", label: "Entregó a tiempo", value: 1 },
      { code: "R", label: "Entregó con retardo", value: 0.5 },
      { code: "0", label: "No entregó", value: 0 },
    ],
  },
  {
    key: "desempeno",
    name: "Excelente / Bueno / Suficiente / Insuficiente",
    type: "OPTIONS",
    options: [
      { code: "E", label: "Excelente", value: 10 },
      { code: "B", label: "Bueno", value: 8 },
      { code: "S", label: "Suficiente", value: 6 },
      { code: "I", label: "Insuficiente", value: 0 },
    ],
  },
];

export function describeScale(s: { type: string; maxScore?: number | null; options?: GradeOption[] | null }) {
  if (s.type === "NUMERIC") return `0 – ${s.maxScore ?? 100}`;
  return (s.options ?? []).map((o) => o.code).join(" / ");
}

type ScaleLike = { scaleType: string; maxScore: number | null; options: unknown };
type GradeLike = { score: number | null; optionCode: string | null };

export function asOptions(v: unknown): GradeOption[] {
  return Array.isArray(v) ? (v as GradeOption[]) : [];
}

/** Calificación como la ve el maestro (ej. "85", "R"). null si no está calificado. */
export function gradeDisplay(a: ScaleLike, g: GradeLike | null | undefined): string | null {
  if (!g) return null;
  if (a.scaleType === "NUMERIC") return g.score == null ? null : formatNumber(g.score);
  return g.optionCode ?? null;
}

/** Calificación normalizada a 0–100 (para promedios). null si no está calificado. */
export function gradePercent(a: ScaleLike, g: GradeLike | null | undefined): number | null {
  if (!g) return null;
  if (a.scaleType === "NUMERIC") {
    if (g.score == null || !a.maxScore) return null;
    return (g.score / a.maxScore) * 100;
  }
  const opts = asOptions(a.options);
  const opt = opts.find((o) => o.code === g.optionCode);
  if (!opt) return null;
  const max = Math.max(...opts.map((o) => o.value));
  return max > 0 ? (opt.value / max) * 100 : 0;
}

/** Promedio ponderado (0–100) de las asignaciones calificadas. null si no hay ninguna. */
export function weightedAverage(items: { percent: number | null; weight: number }[]) {
  let sum = 0;
  let weights = 0;
  for (const it of items) {
    if (it.percent == null || it.weight <= 0) continue;
    sum += it.percent * it.weight;
    weights += it.weight;
  }
  return weights === 0 ? null : sum / weights;
}

export function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

// ---------- Rúbricas ----------

export type RubricCriterion = { id: string; title: string; description: string; points: number };
export type RubricPreset = { key: string; name: string; criteria: Omit<RubricCriterion, "id">[] };

export const PRESET_RUBRICS: RubricPreset[] = [
  {
    key: "tarea",
    name: "Tarea / ejercicios",
    criteria: [
      { title: "Resultados correctos", description: "Los ejercicios están resueltos correctamente.", points: 50 },
      { title: "Procedimiento", description: "Muestra el desarrollo completo y ordenado.", points: 30 },
      { title: "Presentación y puntualidad", description: "Limpio, legible y entregado a tiempo.", points: 20 },
    ],
  },
  {
    key: "ensayo",
    name: "Ensayo / reporte escrito",
    criteria: [
      { title: "Contenido y argumentación", description: "Ideas claras, sustentadas y relevantes al tema.", points: 40 },
      { title: "Estructura", description: "Introducción, desarrollo y conclusión coherentes.", points: 20 },
      { title: "Fuentes y citas", description: "Usa fuentes confiables citadas en formato correcto.", points: 20 },
      { title: "Ortografía y redacción", description: "Sin errores ortográficos; redacción fluida.", points: 20 },
    ],
  },
  {
    key: "exposicion",
    name: "Exposición oral",
    criteria: [
      { title: "Dominio del tema", description: "Explica con seguridad y responde preguntas.", points: 35 },
      { title: "Material de apoyo", description: "Diapositivas o recursos claros y útiles.", points: 25 },
      { title: "Expresión oral", description: "Volumen, claridad y contacto visual.", points: 25 },
      { title: "Manejo del tiempo", description: "Se ajusta al tiempo asignado.", points: 15 },
    ],
  },
  {
    key: "proyecto",
    name: "Proyecto",
    criteria: [
      { title: "Cumplimiento de requisitos", description: "Cubre todo lo solicitado.", points: 35 },
      { title: "Calidad técnica", description: "Solución funcional, bien construida.", points: 30 },
      { title: "Creatividad", description: "Propuesta original o con valor agregado.", points: 15 },
      { title: "Documentación", description: "Reporte/manual claro del trabajo realizado.", points: 20 },
    ],
  },
  {
    key: "equipo",
    name: "Trabajo en equipo",
    criteria: [
      { title: "Participación", description: "Contribuye activamente a las tareas del equipo.", points: 40 },
      { title: "Colaboración", description: "Escucha, respeta y apoya a sus compañeros.", points: 30 },
      { title: "Responsabilidad", description: "Cumple su parte a tiempo.", points: 30 },
    ],
  },
];

export function asRubric(v: unknown): RubricCriterion[] {
  return Array.isArray(v) ? (v as RubricCriterion[]) : [];
}

export function rubricTotal(rubric: { points: number }[]) {
  return rubric.reduce((a, c) => a + (c.points || 0), 0);
}

// ---------- Tipos que viajan entre API y cliente ----------

export type AssignmentDTO = {
  id: string;
  name: string;
  description: string;
  dueDate: string | null;
  weight: number;
  scaleName: string;
  scaleType: "NUMERIC" | "OPTIONS";
  maxScore: number | null;
  options: GradeOption[];
  rubric: RubricCriterion[];
  createdAt: string;
  gradedCount?: number;
};

export type SavedScaleDTO = {
  id: string;
  name: string;
  type: "NUMERIC" | "OPTIONS";
  maxScore: number | null;
  options: GradeOption[];
};

export type RubricTemplateDTO = { id: string; name: string; criteria: Omit<RubricCriterion, "id">[] };
