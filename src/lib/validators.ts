import { z } from "zod";

export const SUBJECT_ICONS = [
  "📐", "💻", "🗄️", "🔬", "📊", "📖", "🧪", "🎨",
  "🏫", "🌍", "⚽", "🎵", "🏥", "⚗️", "📷", "🧮",
] as const;

export const loginSchema = z.object({
  role: z.enum(["maestro", "alumno"]),
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
  institutionId: z.string().trim().optional(),
});

export const registerTeacherSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto"),
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerStudentSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto"),
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  institutionId: z.string().trim().min(3, "ID de institución inválido"),
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  room: z.string().trim().min(1),
  scheduleText: z.string().trim().min(1),
  weekdays: z.array(z.number().int().min(0).max(4)).min(1),
  icon: z.enum(SUBJECT_ICONS).optional(),
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().min(2).optional(),
  room: z.string().trim().min(1).optional(),
  scheduleText: z.string().trim().min(1).optional(),
  weekdays: z.array(z.number().int().min(0).max(4)).min(1).optional(),
  active: z.boolean().optional(),
  icon: z.enum(SUBJECT_ICONS).optional(),
  joinEnabled: z.boolean().optional(),
});

export const generateQrSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const inviteStudentSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
});

export const enrollmentStatusSchema = z.object({
  active: z.boolean(),
});

export const updateStudentSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    institutionId: z.string().trim().min(3).optional(),
  })
  .refine((d) => d.name !== undefined || d.institutionId !== undefined, {
    message: "Nada que actualizar",
  });

export const scanSchema = z.object({
  token: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const reviewJustificationSchema = z.object({
  action: z.enum(["approve", "reject"]),
  absenceDate: z.string().optional(),
});

export const joinSubjectSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,6}$/, "El código tiene máximo 6 letras o números"),
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const manualAttendanceSchema = z.object({
  date: dateOnly,
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // null borra el registro manual (el alumno vuelve a "sin registrar" / falta)
        status: z.enum(["PRESENTE", "RETARDO", "FALTA"]).nullable(),
      }),
    )
    .min(1)
    .max(500),
});

const gradeOptionSchema = z.object({
  code: z.string().trim().min(1, "Cada opción necesita un código").max(4, "Código de opción muy largo (máx. 4)"),
  label: z.string().trim().max(60).default(""),
  value: z.number().finite(),
});

export const gradeScaleSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().trim().min(1).max(80),
    type: z.literal("NUMERIC"),
    maxScore: z.number().positive("La calificación máxima debe ser mayor a 0").max(100000),
  }),
  z.object({
    name: z.string().trim().min(1).max(80),
    type: z.literal("OPTIONS"),
    options: z
      .array(gradeOptionSchema)
      .min(2, "Agrega al menos 2 opciones")
      .max(12)
      .refine((opts) => new Set(opts.map((o) => o.code.toUpperCase())).size === opts.length, {
        message: "Los códigos de las opciones no pueden repetirse",
      }),
  }),
]);

export const rubricCriterionSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  title: z.string().trim().min(1, "Cada criterio necesita un nombre").max(120),
  description: z.string().trim().max(500).default(""),
  points: z.number().min(0).max(10000),
});

const assignmentFields = {
  name: z.string().trim().min(1, "Ponle nombre a la asignación").max(150),
  description: z.string().trim().max(2000),
  dueDate: dateOnly.nullable(),
  weight: z.number().min(0).max(1000),
  scale: gradeScaleSchema,
  rubric: z.array(rubricCriterionSchema).max(30),
};

export const assignmentSchema = z.object({
  ...assignmentFields,
  description: assignmentFields.description.default(""),
  dueDate: assignmentFields.dueDate.optional(),
  weight: assignmentFields.weight.default(1),
  rubric: assignmentFields.rubric.default([]),
});

// sin defaults: un campo omitido en la edición no se toca
export const updateAssignmentSchema = z.object(assignmentFields).partial();

export const saveGradesSchema = z.object({
  grades: z
    .array(
      z.object({
        studentId: z.string().min(1),
        score: z.number().finite().nullable().optional(),
        optionCode: z.string().trim().max(4).nullable().optional(),
        rubricScores: z.record(z.string(), z.number().min(0)).nullable().optional(),
        comment: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const rubricTemplateSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre a la rúbrica").max(80),
  criteria: z.array(rubricCriterionSchema.omit({ id: true })).min(1, "Agrega al menos un criterio").max(30),
});
