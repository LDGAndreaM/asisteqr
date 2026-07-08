import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { saveJustificationFile } from "@/lib/uploads";

export async function GET() {
  try {
    const user = await requireUser();

    const justifications = await prisma.justification.findMany({
      where: user.role === "TEACHER" ? { subject: { teacherId: user.id } } : { studentId: user.id },
      include: { student: true, subject: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      justifications: justifications.map((j) => ({
        id: j.id,
        studentName: j.student.name,
        subjectId: j.subjectId,
        subjectName: j.subject.name,
        absenceDate: j.absenceDate.toISOString().slice(0, 10),
        reason: j.reason,
        fileName: j.fileName,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("STUDENT");
    const form = await req.formData();

    const subjectId = String(form.get("subjectId") ?? "");
    const absenceDateStr = String(form.get("absenceDate") ?? "");
    const reason = String(form.get("reason") ?? "").trim();
    const file = form.get("file");

    if (!subjectId || !absenceDateStr || !reason) {
      return NextResponse.json({ error: "Completa materia, fecha y motivo" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Adjunta un documento" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo debe pesar menos de 8 MB" }, { status: 400 });
    }

    const enrolled = await prisma.enrollment.findUnique({
      where: { subjectId_studentId: { subjectId, studentId: user.id } },
    });
    if (!enrolled || !enrolled.active) {
      return NextResponse.json({ error: "No estás inscrito en esa materia" }, { status: 403 });
    }

    const absenceDate = new Date(absenceDateStr);
    absenceDate.setHours(0, 0, 0, 0);

    const { storedName, originalName } = await saveJustificationFile(file);

    const justification = await prisma.justification.create({
      data: {
        studentId: user.id,
        subjectId,
        absenceDate,
        reason,
        fileName: originalName,
        filePath: storedName,
      },
    });

    return NextResponse.json({ justification }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
