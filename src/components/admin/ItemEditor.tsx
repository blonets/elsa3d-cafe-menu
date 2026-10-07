"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Copy, Plus, Trash2 } from "lucide-react";
import {
  createVariant,
  deleteVariant,
  duplicateItem,
  deleteItem,
  setItemAddonGroups,
  toggleItemAvailability,
  toggleVariantAvailability,
  updateItem,
  updateVariant,
} from "@/lib/actions/items";
import { BADGES, BADGE_LABELS_AR } from "@/lib/badges";

type V = { id: number; nameAr: string | null; nameEn: string | null; price: string | null; isActive: boolean; isAvailable: boolean };

export default function ItemEditor({
  item,
  variants: initialVariants,
  categories,
  addonGroups,
  linkedGroupIds,
}: {
  item: {
    id: number;
    code: string;
    categoryId: number;
    nameAr: string;
    nameEn: string;
    descAr: string | null;
    descEn: string | null;
    badges: string[];
    prepNote: string | null;
    isActive: boolean;
    isAvailable: boolean;
  };
  variants: V[];
  categories: { id: number; nameAr: string }[];
  addonGroups: { id: number; nameAr: string; nameEn: string }[];
  linkedGroupIds: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(item);
  const [variants, setVariants] = useState(initialVariants);
  const [groups, setGroups] = useState<number[]>(linkedGroupIds);
  const [toast, setToast] = useState("");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const save = async () => {
    await updateItem(item.id, {
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      descAr: form.descAr,
      descEn: form.descEn,
      badges: form.badges,
      prepNote: form.prepNote,
      categoryId: form.categoryId,
      isActive: form.isActive,
    });
    await setItemAddonGroups(item.id, groups);
    flash("تم الحفظ ✓ هيظهر في المنيو خلال ثواني");
    startTransition(() => router.refresh());
  };

  const addVariant = async () => {
    const res = await createVariant(item.id, { nameAr: "خيار جديد", price: "" });
    if (res.ok && res.id) {
      setVariants((prev) => [...prev, { id: res.id!, nameAr: "خيار جديد", nameEn: null, price: null, isActive: true, isAvailable: true }]);
      startTransition(() => router.refresh());
    }
  };

  const del = async () => {
    if (!confirm(`تأكيد حذف "${item.nameAr}" نهائياً؟ التراجع متاح من سجل العمليات.`)) return;
    await deleteItem(item.id);
    router.push("/admin/items");
    router.refresh();
  };

  const dup = async () => {
    const res = await duplicateItem(item.id);
    if (res.ok && res.id) {
      router.push(`/admin/items/${res.id}`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/items" className="btn btn-ghost btn-sm">
          <ArrowRight size={14} /> رجوع للأصناف
        </Link>
        <div className="flex gap-2">
          <button onClick={dup} className="btn btn-ghost btn-sm">
            <Copy size={13} /> نسخ
          </button>
          <button onClick={del} className="btn btn-ghost btn-sm !text-red-500">
            <Trash2 size={13} /> حذف
          </button>
        </div>
      </div>

      <header>
        <h1 className="menu-title text-2xl">{form.nameAr || "صنف"}</h1>
        <p className="text-[12px] font-mono" dir="ltr" style={{ color: "var(--ink-faint)" }}>
          {item.code}
        </p>
      </header>

      <section className="card p-5 space-y-4">
        <h2 className="font-extrabold text-[15px]">البيانات الأساسية</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الاسم بالعربي</span>
            <input className="inp" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الاسم بالإنجليزي</span>
            <input className="inp" dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الوصف بالعربي</span>
            <textarea className="inp" rows={2} value={form.descAr ?? ""} onChange={(e) => setForm({ ...form, descAr: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الوصف بالإنجليزي</span>
            <textarea className="inp" rows={2} dir="ltr" value={form.descEn ?? ""} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">القسم</span>
            <select className="inp" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">وقت التحضير (وضع الذروة)</span>
            <input
              className="inp"
              placeholder="مثال: وقت التحضير ~7 دقائق"
              value={form.prepNote ?? ""}
              onChange={(e) => setForm({ ...form, prepNote: e.target.value })}
            />
          </label>
        </div>

        <div>
          <span className="text-[12.5px] font-bold mb-1.5 block">الشارات</span>
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <label key={b} className={`chip cursor-pointer ${form.badges.includes(b) ? "chip-accent" : ""}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={form.badges.includes(b)}
                  onChange={(e) =>
                    setForm({ ...form, badges: e.target.checked ? [...form.badges, b] : form.badges.filter((x) => x !== b) })
                  }
                />
                {BADGE_LABELS_AR[b]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-1">
          <label className="flex items-center gap-2 text-[13.5px] font-bold cursor-pointer select-none">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
            ظاهر في المنيو
          </label>
          <label className="flex items-center gap-2 text-[13.5px] font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={async (e) => {
                setForm({ ...form, isAvailable: e.target.checked });
                await toggleItemAvailability(item.id, e.target.checked);
              }}
              className="w-4 h-4"
            />
            متوفر (مش خلصان)
          </label>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[15px]">خيارات السعر (الأحجام / التحضير)</h2>
          <button onClick={addVariant} className="btn btn-ghost btn-sm">
            <Plus size={13} /> خيار جديد
          </button>
        </div>
        {variants.length === 0 && (
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            بدون خيارات — الصنف هيتعرض "بدون سعر". ضيف خيار واحد على الأقل بالسعر.
          </p>
        )}
        {variants.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: "var(--line)" }}>
            <input
              className="inp inp-sm !w-36"
              value={v.nameAr ?? ""}
              placeholder="اسم بالعربي"
              onChange={(e) => setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, nameAr: e.target.value } : x)))}
              onBlur={() => void updateVariant(v.id, { nameAr: v.nameAr })}
            />
            <input
              className="inp inp-sm !w-36"
              dir="ltr"
              value={v.nameEn ?? ""}
              placeholder="Name (EN)"
              onChange={(e) => setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, nameEn: e.target.value } : x)))}
              onBlur={() => void updateVariant(v.id, { nameEn: v.nameEn })}
            />
            <input
              className="inp inp-sm !w-24 text-center font-bold"
              dir="ltr"
              inputMode="decimal"
              value={v.price ?? ""}
              placeholder="السعر"
              onChange={(e) => setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, price: e.target.value } : x)))}
              onBlur={(e) => void updateVariant(v.id, { price: e.target.value })}
            />
            <label className="flex items-center gap-1.5 text-[12px] font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={v.isAvailable}
                onChange={async (e) => {
                  setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, isAvailable: e.target.checked } : x)));
                  await toggleVariantAvailability(v.id, e.target.checked);
                }}
                className="w-3.5 h-3.5"
              />
              متوفر
            </label>
            <button
              onClick={async () => {
                await deleteVariant(v.id);
                setVariants((prev) => prev.filter((x) => x.id !== v.id));
                startTransition(() => router.refresh());
              }}
              className="btn btn-ghost btn-sm !p-1.5 !text-red-500 ms-auto"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-extrabold text-[15px]">مجموعات الإضافات المرتبطة</h2>
        {addonGroups.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
            مفيش مجموعات إضافات — اعملها من صفحة «الإضافات»
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {addonGroups.map((g) => (
              <label
                key={g.id}
                className={`chip cursor-pointer ${groups.includes(g.id) ? "chip-accent" : ""}`}
                onClick={() => void 0}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={groups.includes(g.id)}
                  onChange={(e) => setGroups(e.target.checked ? [...groups, g.id] : groups.filter((x) => x !== g.id))}
                />
                {g.nameAr}
              </label>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={pending} className="btn btn-primary shadow-lg !px-8 !py-3">
          {pending ? "…" : "حفظ التغييرات"}
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
