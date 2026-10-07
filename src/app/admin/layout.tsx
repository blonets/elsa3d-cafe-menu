import { MENU_URL } from "@/lib/env";
import { hasValidSession } from "@/lib/auth";
import AdminChrome from "@/components/admin/AdminChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await hasValidSession();
  if (!authed) {
    return <div className="admin-bg">{children}</div>;
  }
  return <AdminChrome menuUrl={MENU_URL}>{children}</AdminChrome>;
}
