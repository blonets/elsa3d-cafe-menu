"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { updateAppearance } from "@/lib/actions/settings";

type S = {
  primaryColor: string;
  accentColor: string;
  fontChoice: string;
  defaultMode: string;
  oosDisplayMode: string;
  peakMode: boolean;
  footerNoteAr: string | null;
  footerNoteEn: string | null;
  workingHours: string | null;
};

export default function AppearanceForm({ settings, menuUrl }: { settings: S; menuUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const [iframeKey, setIframeKey] = useState(0);

  const save = async (patch: Partial<S>) => {
    const next = { ...form, ...patch };
    setForm(next);
    const res = await updateAppearance({
      ...patch,
      footerNoteAr: patch.footerNoteAr !== undefined ? patch.footerNoteAr : undefined,
      footerNoteEn: patch.footerNoteEn !== undefined ? patch.footerNoteEn : undefined,
      workingHours: patch.workingHours !== undefined ? patch.workingHours : undefined,
    } as never);
    if (res.ok) {
      setSaved("تم الحفظ ✓ المعاينة هتتحدث خلال ثواني");
      setTimeout(() => setSaved(""), 3000);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <div className="space-y-4">
        <section className="card p-5 space-y-4">
          <h2 className="font-extrabold text-[15px]">الألوان</h2>
          <div className="flex flex-wrap gap-5">
            <ColorField label="اللون الأساسي (الخلفيات الداكنة)" value={form.primaryColor} onChange={(v) => save({ primaryColor: v })} />
            <ColorField label="لون التمييز (الأسعار والشارات)" value={form.accentColor} onChange={(v) => save({ accentColor: v })} />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { p: "#1c1917", a: "#b8860b", name: "كلاسيكي فاخر" },
              { p: "#0f172a", a: "#0284c7", name: "أزرق عصري" },
              { p: "#14532d", a: "#ca8a04", name: "أخضر ودهبي" },
              { p: "#3b0764", a: "#c084fc", name: "بنفسجي" },
            ].map((t) => (
              <button
                key={t.name}
                className="chip cursor-pointer"
                onClick={() => save({ primaryColor: t.p, accentColor: t.a })}
              >
                <span className="inline-block w-3 h-3 rounded-full me-1" style={{ background: t.p }} />
                <span className="inline-block w-3 h-3 rounded-full me-1" style={{ background: t.a }} />
                {t.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-extrabold text-[15px]">الخطوط والوضع</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">خط العناوين</span>
              <select className="inp" value={form.fontChoice} onChange={(e) => save({ fontChoice: e.target.value })}>
                <option value="cairo">Cairo (عصري)</option>
                <option value="amiri-headings">Amiri (كلاسيكي فخم)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">الوضع الافتراضي</span>
              <select className="inp" value={form.defaultMode} onChange={(e) => save({ defaultMode: e.target.value })}>
                <option value="auto">تلقائي (ليلي بعد 6 م)</option>
                <option value="light">نهاري دائماً</option>
                <option value="dark">ليلي دائماً</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-extrabold text-[15px]">سلوك الأصناف</h2>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">عرض الأصناف اللي خلصان</span>
            <select className="inp" value={form.oosDisplayMode} onChange={(e) => save({ oosDisplayMode: e.target.value })}>
              <option value="hide">تختفي من المنيو</option>
              <option value="gray">تبظهر باهتة ومشطوبة</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <p className="text-[13.5px] font-extrabold">وضع الذروة</p>
              <p className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
                الأصناف اللي عليها وقت تحضير تظهر البادج بدل ما تختفي
              </p>
            </div>
            <input type="checkbox" checked={form.peakMode} onChange={(e) => save({ peakMode: e.target.checked })} className="w-4 h-4" />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">مواعيد العمل (تظهر في الفوتر)</span>
            <input
              className="inp"
              placeholder="يومياً من 10 صباحاً لـ 2 بعد منتصف الليل"
              value={form.workingHours ?? ""}
              onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
              onBlur={(e) => save({ workingHours: e.target.value })}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">ملاحظة الفوتر (عربي)</span>
              <input
                className="inp"
                value={form.footerNoteAr ?? ""}
                onChange={(e) => setForm({ ...form, footerNoteAr: e.target.value })}
                onBlur={(e) => save({ footerNoteAr: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">ملاحظة الفوتر (إنجليزي)</span>
              <input
                className="inp"
                dir="ltr"
                value={form.footerNoteEn ?? ""}
                onChange={(e) => setForm({ ...form, footerNoteEn: e.target.value })}
                onBlur={(e) => save({ footerNoteEn: e.target.value })}
              />
            </label>
          </div>
        </section>

        {saved && <p className="text-[13px] font-bold text-green-600">{saved}</p>}
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-4">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-extrabold text-[13.5px]">معاينة حية</p>
            <button onClick={() => setIframeKey((k) => k + 1)} className="btn btn-ghost btn-sm !p-1.5" title="تحديث المعاينة">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="rounded-2xl border-4 border-black/80 overflow-hidden bg-black" style={{ aspectRatio: "9/17" }}>
            <iframe
              key={iframeKey}
              src={`${menuUrl}?preview=${iframeKey}`}
              className="w-full h-full"
              title="معاينة المنيو"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
          <p className="text-[11px] mt-2 text-center" style={{ color: "var(--ink-faint)" }}>
            اضغط ↻ بعد الحفظ لو المعاينة ما اتحدثتش
          </p>
        </div>
      </aside>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-bold mb-1 block">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent"
          style={{ borderColor: "var(--line)" }}
        />
        <input className="inp !w-24 font-mono" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}
