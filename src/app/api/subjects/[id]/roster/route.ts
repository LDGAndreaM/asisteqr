import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const [enrollments, invitations] = await Promise.all([
      prisma.enrollment.findMany({
        where: { subjectId: id },
        include: { student: true },
        orderBy: { student: { name: "asc" } },
      }),
      prisma.invitation.findMany({
        where: { subjectId: id, claimedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        studentId: e.studentId,
        name: e.student.name,
        email: e.student.email,
        institutionId: e.student.institutionId,
        active: e.active,
      })),
      pending: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
