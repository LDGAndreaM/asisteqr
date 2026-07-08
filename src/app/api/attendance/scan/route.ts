import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scanSchema } from "@/lib/validators";
import { errorResponse } from "@/lib/api";
import { distanceMeters } from "@/lib/geo";
import { todayMidnight } from "@/lib/week";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("STUDENT");
    const { token, latitude, longitude } = scanSchema.parse(await req.json());

    const qr = await prisma.qrToken.findUnique({ where: { token }, include: { subject: true } });
    if (!qr) {
      return NextResponse.json({ error: "Código QR inválido" }, { status: 404 });
    }
    if (qr.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Este código expiró. Pide al maestro que lo vuelva a mostrar." },
        { status: 410 },
      );
    }

    const subject = qr.subject;

    if (!subject.active) {
      return NextResponse.json({ error: "Esta materia está archivada" }, { status: 400 });
    }

    const enrolled = await prisma.enrollment.findUnique({
      where: { subjectId_studentId: { subjectId: subject.id, studentId: user.id } },
    });
    if (!enrolled || !enrolled.active) {
      return NextResponse.json(
        { error: `No estás inscrito en ${subject.name}. Únete con la clave ${subject.code} primero.` },
        { status: 403 },
      );
    }

    const classDate = todayMidnight();

    const existing = await prisma.attendanceRecord.findUnique({
      where: { subjectId_studentId_classDate: { subjectId: subject.id, studentId: user.id, classDate } },
    });
    if (existing?.status === "PRESENTE") {
      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        subjectName: subject.name,
        time: existing.scannedAt.toISOString().slice(11, 16),
      });
    }

    const distanceM =
      subject.latitude != null && subject.longitude != null
        ? distanceMeters(latitude, longitude, subject.latitude, subject.longitude)
        : 0;
    const inside = subject.latitude == null || distanceM <= subject.radiusM;

    const now = new Date();
    const record = await prisma.attendanceRecord.upsert({
      where: { subjectId_studentId_classDate: { subjectId: subject.id, studentId: user.id, classDate } },
      create: {
        subjectId: subject.id,
        studentId: user.id,
        classDate,
        scannedAt: now,
        status: inside ? "PRESENTE" : "FALTA",
        locationStatus: inside ? "DENTRO" : "FUERA",
        latitude,
        longitude,
        distanceM,
      },
      update: {
        scannedAt: now,
        status: inside ? "PRESENTE" : "FALTA",
        locationStatus: inside ? "DENTRO" : "FUERA",
        latitude,
        longitude,
        distanceM,
      },
    });

    return NextResponse.json({
      ok: inside,
      alreadyRegistered: false,
      subjectName: subject.name,
      time: record.scannedAt.toISOString().slice(11, 16),
      distanceM: Math.round(distanceM),
      radiusM: subject.radiusM,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
