import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-2xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">إعدادات الكافيه</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          بيانات البراند والتواصل — بتظهر في المنيو والطباعة ورموز QR
        </p>
      </header>
      <SettingsForm
        settings={{
          cafeNameAr: s.cafeNameAr,
          cafeNameEn: s.cafeNameEn,
          phone: s.phone,
          whatsapp: s.whatsapp,
          currencyLabel: s.currencyLabel,
        }}
      />
    </div>
  );
}
