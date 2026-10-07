import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MENU_URL } from "@/lib/env";
import QrCenter from "@/components/admin/QrCenter";

export const dynamic = "force-dynamic";

export default async function AdminQrPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">مركز رموز QR</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          رمز المنيو الأساسي + رموز التربيزات بـ PNG/SVG جاهزة للطباعة
        </p>
      </header>
      <QrCenter menuUrl={MENU_URL} accent={s.accentColor} primary={s.primaryColor} />
    </div>
  );
}
