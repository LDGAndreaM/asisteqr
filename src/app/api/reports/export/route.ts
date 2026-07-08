import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { weeklyMatrixForSubject, type DayCellStatus } from "@/lib/attendance";
import { mondayForOffset, weekdayDates } from "@/lib/week";

const STATUS_TEXT: Record<DayCellStatus, string> = {
  PRESENTE: "Presente",
  FALTA: "Falta",
  JUSTIFICADO: "Justificado",
  SIN_CLASE: "Sin clase",
};

function csvEscape(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("TEACHER");
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const weekOffset = Number(searchParams.get("weekOffset") ?? "0");
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    if (!subjectId) return NextResponse.json({ error: "Falta subjectId" }, { status: 400 });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.teacherId !== user.id) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    const monday = mondayForOffset(weekOffset);
    const days = weekdayDates(monday);
    const rows = await weeklyMatrixForSubject(subjectId, days.map((d) => d.date));

    const header = ["Alumno", ...days.map((d) => `${d.short} ${d.dnum} ${d.mon}`), "Presentes", "Faltas", "Justificadas"];
    const fileBase = `reporte_${subject.name.replace(/\s+/g, "_")}_${days[0].dnum}${days[0].mon}`;

    if (format === "csv") {
      const lines = [header.map(csvEscape).join(",")];
      for (const r of rows) {
        lines.push(
          [r.name, ...r.cells.map((c) => STATUS_TEXT[c]), r.present, r.absent, r.justified]
            .map(csvEscape)
            .join(","),
        );
      }
      const csv = "﻿" + lines.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asistencia");
    sheet.addRow(header);
    sheet.getRow(1).font = { bold: true };
    for (const r of rows) {
      sheet.addRow([r.name, ...r.cells.map((c) => STATUS_TEXT[c]), r.present, r.absent, r.justified]);
    }
    sheet.columns.forEach((col) => {
      col.width = 16;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
