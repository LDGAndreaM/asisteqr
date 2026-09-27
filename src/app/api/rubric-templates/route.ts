import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { rubricTemplateSchema } from "@/lib/validators";

/** Rúbricas que el maestro guardó para reutilizar (las predefinidas viven en src/lib/grading.ts). */
export async function GET() {
  try {
    const user = await requireUser("TEACHER");
    const templates = await prisma.rubricTemplate.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      templates: templates.map((t) => ({ id: t.id, name: t.name, criteria: t.criteria })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("TEACHER");
    const data = rubricTemplateSchema.parse(await req.json());
    const t = await prisma.rubricTemplate.create({
      data: { teacherId: user.id, name: data.name, criteria: data.criteria },
    });
    return NextResponse.json({ template: { id: t.id, name: t.name, criteria: t.criteria } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
