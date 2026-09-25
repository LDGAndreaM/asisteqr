import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Assignment, Grade } from "@/generated/prisma/client";
import {
  asOptions,
  asRubric,
  gradeDisplay,
  gradePercent,
  weightedAverage,
  type GradeOption,
  type RubricCriterion,
} from "@/lib/grading";
import { toDateOnly } from "@/lib/week";

export async function getOwnedSubject(id: string, teacherId: string) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  return subject && subject.teacherId === teacherId ? subject : null;
}

export async function getOwnedAssignment(subjectId: string, assignmentId: string, teacherId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { subject: true },
  });
  if (!assignment || assignment.subjectId !== subjectId || assignment.subject.teacherId !== teacherId) {
    return null;
  }
  return assignment;
}

/** Asigna ids estables a los criterios que no tienen (los nuevos). */
export function withCriterionIds(
  criteria: { id?: string; title: string; description: string; points: number }[],
): RubricCriterion[] {
  return criteria.map((c) => ({ ...c, id: c.id ?? randomUUID().slice(0, 8) }));
}

export function serializeAssignment(a: Assignment) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    dueDate: a.dueDate ? toDateOnly(a.dueDate) : null,
    weight: a.weight,
    scaleName: a.scaleName,
    scaleType: a.scaleType,
    maxScore: a.maxScore,
    options: asOptions(a.options) as GradeOption[],
    rubric: asRubric(a.rubric),
    createdAt: a.createdAt.toISOString(),
  };
}

export function serializeGrade(g: Grade) {
  return {
    studentId: g.studentId,
    score: g.score,
    optionCode: g.optionCode,
    rubricScores: (g.rubricScores ?? null) as Record<string, number> | null,
    comment: g.comment,
    gradedAt: g.gradedAt.toISOString(),
  };
}

/** Alumnos para la libreta de calificaciones: inscritos activos + removidos que ya tienen calificación. */
async function gradebookRoster(subjectId: string, grades: Grade[]) {
  const enrollments = await prisma.enrollment.findMany({
    where: { subjectId },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });
  const graded = new Set(grades.map((g) => g.studentId));
  return enrollments
    .filter((e) => e.active || graded.has(e.studentId))
    .map((e) => ({
      studentId: e.studentId,
      name: e.student.name,
      email: e.student.email,
      institutionId: e.student.institutionId,
      active: e.active,
    }));
}

/** Todas las asignaciones de la materia con sus calificaciones y el promedio de cada alumno. */
export async function loadGradebook(subjectId: string) {
  const assignments = await prisma.assignment.findMany({
    where: { subjectId },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    include: { grades: true },
  });
  const allGrades = assignments.flatMap((a) => a.grades);
  const students = await gradebookRoster(subjectId, allGrades);

  const rows = students.map((s) => {
    const cells = assignments.map((a) => {
      const g = a.grades.find((x) => x.studentId === s.studentId);
      return { display: gradeDisplay(a, g), percent: gradePercent(a, g), comment: g?.comment ?? "" };
    });
    const average = weightedAverage(cells.map((c, i) => ({ percent: c.percent, weight: assignments[i].weight })));
    return { ...s, cells, average };
  });

  return { assignments, students, rows };
}

/** Roster + calificaciones de una sola asignación. */
export async function loadAssignmentGrades(assignmentId: string, subjectId: string) {
  const grades = await prisma.grade.findMany({ where: { assignmentId } });
  const students = await gradebookRoster(subjectId, grades);
  return { students, grades: grades.map(serializeGrade) };
}
