import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { MENU_URL } from "@/lib/env";
import AppearanceForm from "@/components/admin/AppearanceForm";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">مظهر المنيو</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          الألوان والخطوط وسلوك الأصناف اللي خلصان — مع معاينة حية للموبايل
        </p>
      </header>
      <AppearanceForm
        settings={{
          primaryColor: s.primaryColor,
          accentColor: s.accentColor,
          fontChoice: s.fontChoice,
          defaultMode: s.defaultMode,
          oosDisplayMode: s.oosDisplayMode,
          peakMode: s.peakMode,
          footerNoteAr: s.footerNoteAr,
          footerNoteEn: s.footerNoteEn,
          workingHours: s.workingHours,
        }}
        menuUrl={MENU_URL}
      />
    </div>
  );
}
