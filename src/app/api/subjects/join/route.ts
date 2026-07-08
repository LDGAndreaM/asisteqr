import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinSubjectSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("STUDENT");
    const { code } = joinSubjectSchema.parse(await req.json());

    const subject = await prisma.subject.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    if (!subject) {
      return NextResponse.json({ error: "No existe ninguna materia con esa clave" }, { status: 404 });
    }
    if (!subject.active) {
      return NextResponse.json({ error: "Esta materia está archivada" }, { status: 400 });
    }

    const already = await prisma.enrollment.findUnique({
      where: { subjectId_studentId: { subjectId: subject.id, studentId: user.id } },
    });
    if (already?.active) {
      return NextResponse.json({ error: "Ya estás inscrito en esta materia" }, { status: 409 });
    }

    await prisma.enrollment.upsert({
      where: { subjectId_studentId: { subjectId: subject.id, studentId: user.id } },
      update: { active: true },
      create: { subjectId: subject.id, studentId: user.id },
    });

    return NextResponse.json({ ok: true, subject: { id: subject.id, name: subject.name } });
  } catch (err) {
    return errorResponse(err);
  }
}
