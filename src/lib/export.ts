import "server-only";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

type Cell = string | number | null;
export type Sheet = { name: string; header: string[]; rows: Cell[][]; widths?: number[] };

function csvEscape(v: Cell) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function safeFileName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Descarga CSV (solo la primera hoja) o Excel (todas las hojas). */
export async function tableDownload(format: "csv" | "xlsx", fileBase: string, sheets: Sheet[]) {
  if (format === "csv") {
    const [first] = sheets;
    const lines = [first.header, ...first.rows].map((r) => r.map(csvEscape).join(","));
    // BOM para que Excel abra bien los acentos
    return new NextResponse("﻿" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  for (const s of sheets) {
    const sheet = workbook.addWorksheet(s.name.slice(0, 31));
    sheet.addRow(s.header);
    sheet.getRow(1).font = { bold: true };
    for (const r of s.rows) sheet.addRow(r);
    sheet.columns.forEach((col, i) => {
      col.width = s.widths?.[i] ?? 16;
    });
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
    },
  });
}
