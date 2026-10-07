"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Eye, Ghost, RotateCcw } from "lucide-react";
import { toggleItemAvailability } from "@/lib/actions/items";
import { updateAnnouncement } from "@/lib/actions/settings";

type OosItem = { id: number; nameAr: string; nameEn: string };

export default function DashboardWidgets({
  oosItems,
  announcement,
  topViewed,
  deadItems,
}: {
  oosItems: OosItem[];
  announcement: { text: string; active: boolean };
  topViewed: { id: number; nameAr: string; views: number }[];
  deadItems: { id: number; nameAr: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [annText, setAnnText] = useState(announcement.text);
  const [annActive, setAnnActive] = useState(announcement.active);
  const [savedMsg, setSavedMsg] = useState("");

  const backInStock = async (id: number) => {
    await toggleItemAvailability(id, true);
    startTransition(() => router.refresh());
  };

  const saveAnnouncement = async () => {
    await updateAnnouncement({ announcement: annText, active: annActive });
    setSavedMsg("تم الحفظ ✓ — هيظهر في المنيو خلال ثواني");
    setTimeout(() => setSavedMsg(""), 3500);
    startTransition(() => router.refresh());
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* OOS quick bar */}
      <section className="card p-5 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw size={16} className="text-orange-500" />
          <h2 className="font-extrabold text-[15px]">شريط التوفر السريع</h2>
          <span className="chip">الأصناف اللي خلصان</span>
        </div>
        {oosItems.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            كله متوفر حالياً ✓
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {oosItems.map((it) => (
              <button
                key={it.id}
                onClick={() => backInStock(it.id)}
                disabled={pending}
                className="btn btn-ghost btn-sm"
                title="رجّعه متوفر"
              >
                {it.nameAr} — رجّعه متوفر
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Announcement quick edit */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={16} className="text-amber-500" />
          <h2 className="font-extrabold text-[15px]">شريط الإعلان</h2>
        </div>
        <textarea
          className="inp"
          rows={3}
          placeholder="مثال: عرض اليوم — آيس لاتيه بـ 25 ج.م بدل 35"
          value={annText}
          onChange={(e) => setAnnText(e.target.value)}
        />
        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer select-none">
            <input type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} className="w-4 h-4 accent-amber-600" />
            مفعّل
          </label>
          <button onClick={saveAnnouncement} disabled={pending} className="btn btn-primary btn-sm">
            حفظ الإعلان
          </button>
        </div>
        {savedMsg && <p className="text-[12.5px] font-bold mt-2 text-green-600">{savedMsg}</p>}
      </section>

      {/* Top viewed */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-blue-500" />
          <h2 className="font-extrabold text-[15px]">الأكثر مشاهدة (7 أيام)</h2>
        </div>
        {topViewed.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            لسه مفيش مشاهدات مسجلة
          </p>
        ) : (
          <ol className="space-y-1.5">
            {topViewed.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between text-[13.5px]">
                <span className="font-bold">
                  <span className="inline-block w-5 opacity-40">{i + 1}.</span> {t.nameAr}
                </span>
                <span className="chip">{t.views} مشاهدة</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Dead items */}
      <section className="card p-5 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Ghost size={16} className="text-purple-500" />
          <h2 className="font-extrabold text-[15px]">أصناف من غير مشاهدة (30 يوم)</h2>
          <span className="chip">ممكن تشيلها أو تعدّل سعرها</span>
        </div>
        {deadItems.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            كل الأصناف بتتحرك ✓
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {deadItems.map((d) => (
              <span key={d.id} className="chip">
                {d.nameAr}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
