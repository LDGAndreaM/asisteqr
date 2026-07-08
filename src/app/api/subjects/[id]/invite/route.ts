import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteStudentSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const { email } = inviteStudentSchema.parse(await req.json());
    const normalizedEmail = email.toLowerCase();

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const existingStudent = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingStudent) {
      if (existingStudent.role !== "STUDENT") {
        return NextResponse.json({ error: "Ese correo pertenece a una cuenta de maestro" }, { status: 400 });
      }
      const enrollment = await prisma.enrollment.upsert({
        where: { subjectId_studentId: { subjectId: id, studentId: existingStudent.id } },
        update: { active: true },
        create: { subjectId: id, studentId: existingStudent.id, active: true },
      });
      return NextResponse.json({ enrolled: true, enrollment });
    }

    const invitation = await prisma.invitation.upsert({
      where: { subjectId_email: { subjectId: id, email: normalizedEmail } },
      update: { claimedAt: null, claimedByStudentId: null },
      create: { subjectId: id, email: normalizedEmail },
    });

    return NextResponse.json({ enrolled: false, invitation }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
