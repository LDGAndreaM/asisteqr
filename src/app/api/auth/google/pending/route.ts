import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PENDING_STUDENT_COOKIE, verifyPendingStudent } from "@/lib/google-auth";

export async function GET() {
  const store = await cookies();
  const token = store.get(PENDING_STUDENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ pending: null });

  const pending = await verifyPendingStudent(token);
  if (!pending) return NextResponse.json({ pending: null });

  return NextResponse.json({ pending });
}
