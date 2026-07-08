import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export default async function Home() {
  const session = await readSession();
  if (!session) redirect("/login");
  redirect(session.role === "TEACHER" ? "/teacher" : "/student");
}
