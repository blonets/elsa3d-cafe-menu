import { hasValidSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  if (await hasValidSession()) redirect("/admin");
  return <LoginForm />;
}
