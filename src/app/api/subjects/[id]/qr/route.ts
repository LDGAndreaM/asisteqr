import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

const QR_TTL_SECONDS = 15;

async function ownedSubject(subjectId: string, teacherId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.teacherId !== teacherId) return null;
  return subject;
}

/** Devuelve el token vigente para la materia, rotándolo si ya expiró. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser("TEACHER");
    const subject = await ownedSubject(id, user.id);
    if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    if (!subject.active) {
      return NextResponse.json({ error: "Esta materia está archivada" }, { status: 400 });
    }

    const latest = await prisma.qrToken.findFirst({
      where: { subjectId: id },
      orderBy: { issuedAt: "desc" },
    });

    const now = new Date();
    let active = latest && latest.expiresAt > now ? latest : null;

    if (!active) {
      active = await prisma.qrToken.create({
        data: {
          subjectId: id,
          token: randomUUID(),
          expiresAt: new Date(now.getTime() + QR_TTL_SECONDS * 1000),
        },
      });
    }

    const qrDataUrl = await QRCode.toDataURL(active.token, {
      margin: 1,
      width: 320,
      color: { dark: "#141020", light: "#ffffff00" },
    });

    const secondsLeft = Math.max(0, Math.ceil((active.expiresAt.getTime() - now.getTime()) / 1000));

    return NextResponse.json({
      token: active.token,
      qrDataUrl,
      secondsLeft,
      ttl: QR_TTL_SECONDS,
      subject: { id: subject.id, name: subject.name, room: subject.room, scheduleText: subject.scheduleText },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
