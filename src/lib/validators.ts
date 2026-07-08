import { z } from "zod";

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
  latitude: z.number(),
  longitude: z.number(),
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().min(2).optional(),
  room: z.string().trim().min(1).optional(),
  scheduleText: z.string().trim().min(1).optional(),
  weekdays: z.array(z.number().int().min(0).max(4)).min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  active: z.boolean().optional(),
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
  code: z.string().trim().min(1),
});
