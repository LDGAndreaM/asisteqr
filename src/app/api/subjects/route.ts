import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubjectSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";
import { subjectAttendanceRate } from "@/lib/attendance";

export async function GET() {
  try {
    const user = await requireUser();

    if (user.role === "TEACHER") {
      const subjects = await prisma.subject.findMany({
        where: { teacherId: user.id },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
        include: { _count: { select: { enrollments: { where: { active: true } } } } },
      });
      const withRate = await Promise.all(
        subjects.map(async (s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          room: s.room,
          scheduleText: s.scheduleText,
          icon: s.icon,
          tint: s.tint,
          weekdays: s.weekdays,
          active: s.active,
          students: s._count.enrollments,
          rate: await subjectAttendanceRate(s),
        })),
      );
      return NextResponse.json({ subjects: withRate });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.id, active: true, subject: { active: true } },
      include: { subject: true },
      orderBy: { subject: { createdAt: "asc" } },
    });
    return NextResponse.json({
      subjects: enrollments.map((e) => ({
        id: e.subject.id,
        name: e.subject.name,
        code: e.subject.code,
        room: e.subject.room,
        scheduleText: e.subject.scheduleText,
        icon: e.subject.icon,
        tint: e.subject.tint,
        weekdays: e.subject.weekdays,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("TEACHER");
    const data = createSubjectSchema.parse(await req.json());

    const existingCode = await prisma.subject.findUnique({
      where: { teacherId_code: { teacherId: user.id, code: data.code } },
    });
    if (existingCode) {
      return NextResponse.json({ error: "Ya tienes una materia con esa clave" }, { status: 409 });
    }

    const icons = ["📐", "💻", "🗄️", "🔬", "📊", "📖", "🧪", "🎨"];
    const tints = ["#ede9ff", "#ffe9df", "#dff7f0", "#ffe4f1", "#e9efff", "#fff3d6"];
    const n = await prisma.subject.count({ where: { teacherId: user.id } });

    const subject = await prisma.subject.create({
      data: {
        teacherId: user.id,
        name: data.name,
        code: data.code,
        room: data.room,
        scheduleText: data.scheduleText,
        weekdays: data.weekdays,
        latitude: data.latitude,
        longitude: data.longitude,
        icon: icons[n % icons.length],
        tint: tints[n % tints.length],
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
