import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requirePartner() {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin");
  if (session?.user.role !== "partner") redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/admin/login");
  return session.user;
}
