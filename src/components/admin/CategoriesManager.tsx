"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, reorderCategories, updateCategory } from "@/lib/actions/catalog";
import { CATEGORY_ICON_KEYS, getIcon } from "@/lib/icons";

type Cat = {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  isActive: boolean;
  viewStyle: string;
  seasonalStartMonth: number | null;
  seasonalEndMonth: number | null;
  itemCount: number;
};

const MONTHS = ["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function CategoriesManager({ categories: initial }: { categories: Cat[] }) {
  const router = useRouter();
  const [cats, setCats] = useState(initial);
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };
  const refresh = () => startTransition(() => router.refresh());

  const patch = (id: number, p: Partial<Cat>) => setCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const save = async (id: number, p: Partial<Cat>) => {
    patch(id, p);
    const res = await updateCategory(id, p);
    if (res.error) {
      flash(res.error);
      router.refresh();
    } else {
      refresh();
    }
  };

  const add = async () => {
    const res = await createCategory("قسم جديد");
    if (res.ok && res.id) {
      refresh();
      flash("اتضاف قسم جديد — عدّله وحفظ");
    }
  };

  const del = async (c: Cat) => {
    if (!confirm(`حذف قسم "${c.nameAr}" ه يحذف ${c.itemCount} صنف داخله نهائياً.\nالتراجع متاح من سجل العمليات. متأكد؟`)) return;
    await deleteCategory(c.id);
    setCats((prev) => prev.filter((x) => x.id !== c.id));
    refresh();
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = cats.findIndex((c) => c.id === Number(active.id));
    const to = cats.findIndex((c) => c.id === Number(over.id));
    const next = arrayMove(cats, from, to);
    setCats(next);
    await reorderCategories(next.map((c) => c.id));
    refresh();
    flash("تم حفظ الترتيب ✓");
  };

  return (
    <div className="space-y-3">
      <button onClick={add} disabled={pending} className="btn btn-primary btn-sm">
        <Plus size={14} /> قسم جديد
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {cats.map((c) => (
              <CategoryCard
                key={c.id}
                cat={c}
                onPatch={patch}
                onSave={save}
                onDelete={() => del(c)}
                iconPickerOpen={iconPickerFor === c.id}
                onToggleIconPicker={() => setIconPickerFor(iconPickerFor === c.id ? null : c.id)}
                onPickIcon={(icon) => {
                  setIconPickerFor(null);
                  save(c.id, { icon });
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {cats.length === 0 && (
        <p className="text-center py-10 text-[13.5px]" style={{ color: "var(--ink-faint)" }}>
          مفيش أقسام — ابدأ بزر «قسم جديد» أو استورد منيو كامل
        </p>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CategoryCard({
  cat,
  onPatch,
  onSave,
  onDelete,
  iconPickerOpen,
  onToggleIconPicker,
  onPickIcon,
}: {
  cat: Cat;
  onPatch: (id: number, p: Partial<Cat>) => void;
  onSave: (id: number, p: Partial<Cat>) => Promise<void>;
  onDelete: () => Promise<void>;
  iconPickerOpen: boolean;
  onToggleIconPicker: () => void;
  onPickIcon: (icon: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const Icon = getIcon(cat.icon);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`card p-4 ${isDragging ? "dragging-row" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="drag-handle mt-1.5" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </span>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onToggleIconPicker} className="icon-btn !w-10 !h-10" title="تغيير الأيقونة">
              {Icon ? <Icon size={17} /> : "＋"}
            </button>
            <input
              className="inp inp-sm !w-40 font-bold"
              value={cat.nameAr}
              onChange={(e) => onPatch(cat.id, { nameAr: e.target.value })}
              onBlur={(e) => onSave(cat.id, { nameAr: e.target.value })}
              placeholder="الاسم بالعربي"
            />
            <input
              className="inp inp-sm !w-40"
              dir="ltr"
              value={cat.nameEn}
              onChange={(e) => onPatch(cat.id, { nameEn: e.target.value })}
              onBlur={(e) => onSave(cat.id, { nameEn: e.target.value })}
              placeholder="Name (EN)"
            />
            <input
              className="inp inp-sm !w-36 font-mono"
              dir="ltr"
              value={cat.slug}
              onChange={(e) => onPatch(cat.id, { slug: e.target.value })}
              onBlur={(e) => onSave(cat.id, { slug: e.target.value })}
              placeholder="slug"
              title="المعرّف — يُستخدم في ملف الاستيراد"
            />
            <span className="chip">{cat.itemCount} صنف</span>
            <button onClick={onDelete} className="btn btn-ghost btn-sm !p-1.5 !text-red-500 ms-auto">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
            <label className="flex items-center gap-1.5 font-bold cursor-pointer select-none">
              <input type="checkbox" checked={cat.isActive} onChange={(e) => onSave(cat.id, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
              ظاهر
            </label>
            <label className="flex items-center gap-1.5 font-bold">
              نمط العرض:
              <select className="inp inp-sm !w-36" value={cat.viewStyle} onChange={(e) => onSave(cat.id, { viewStyle: e.target.value })}>
                <option value="classic_list">قائمة عادية</option>
                <option value="compact_list">قائمة مضغوطة</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 font-bold">
              الموسم من:
              <select
                className="inp inp-sm !w-28"
                value={cat.seasonalStartMonth ?? ""}
                onChange={(e) => onSave(cat.id, { seasonalStartMonth: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">دائم</option>
                {MONTHS.map((m, i) => (i ? <option key={i} value={i}>{m}</option> : null))}
              </select>
              إلى:
              <select
                className="inp inp-sm !w-28"
                value={cat.seasonalEndMonth ?? ""}
                onChange={(e) => onSave(cat.id, { seasonalEndMonth: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">—</option>
                {MONTHS.map((m, i) => (i ? <option key={i} value={i}>{m}</option> : null))}
              </select>
            </label>
          </div>

          {iconPickerOpen && (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border" style={{ borderColor: "var(--line)" }}>
              {CATEGORY_ICON_KEYS.map((k) => {
                const I = getIcon(k)!;
                return (
                  <button
                    key={k}
                    onClick={() => onPickIcon(k)}
                    className={`icon-btn !w-9 !h-9 ${cat.icon === k ? "!border-amber-500 !text-amber-600" : ""}`}
                    title={k}
                  >
                    <I size={16} />
                  </button>
                );
              })}
              <button onClick={() => onPickIcon("") as never} className="icon-btn !w-9 !h-9" title="بدون أيقونة">
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
