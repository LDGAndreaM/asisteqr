-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "GradeScaleType" AS ENUM ('NUMERIC', 'OPTIONS');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'RETARDO';

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'QR';

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "joinCode" TEXT,
ADD COLUMN     "joinEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Genera un código de 6 caracteres para las materias existentes (sin 0/O/1/I para evitar confusiones).
-- La condición sobre s.id hace la subconsulta correlacionada, así se evalúa una vez por fila.
UPDATE "Subject" s SET "joinCode" = (
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32))::int + 1, 1), '')
  FROM generate_series(1, 6)
  WHERE s.id IS NOT NULL
);

ALTER TABLE "Subject" ALTER COLUMN "joinCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GradeScaleType" NOT NULL,
    "maxScore" DOUBLE PRECISION,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scaleName" TEXT NOT NULL,
    "scaleType" "GradeScaleType" NOT NULL,
    "maxScore" DOUBLE PRECISION,
    "options" JSONB,
    "rubric" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "optionCode" TEXT,
    "rubricScores" JSONB,
    "comment" TEXT NOT NULL DEFAULT '',
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricTemplate" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingScale_subjectId_idx" ON "GradingScale"("subjectId");

-- CreateIndex
CREATE INDEX "Assignment_subjectId_idx" ON "Assignment"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_assignmentId_studentId_key" ON "Grade"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "RubricTemplate_teacherId_idx" ON "RubricTemplate"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_joinCode_key" ON "Subject"("joinCode");

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricTemplate" ADD CONSTRAINT "RubricTemplate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

