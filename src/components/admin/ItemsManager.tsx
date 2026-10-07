"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Copy,
  Trash2,
  Search,
  Percent,
  ChevronDown,
  Pencil,
  CircleSlash,
  EyeOff,
} from "lucide-react";
import {
  createItem,
  deleteItem,
  duplicateItem,
  bulkDeleteItems,
  bulkPrice,
  bulkSetActive,
  bulkSetAvailability,
  createVariant,
  deleteVariant,
  reorderItems,
  toggleItemActive,
  toggleItemAvailability,
  toggleVariantAvailability,
  updateItem,
  updateVariant,
} from "@/lib/actions/items";
import { BADGES, BADGE_LABELS_AR } from "@/lib/badges";

type V = { id: number; nameAr: string | null; nameEn: string | null; price: string | null; isActive: boolean; isAvailable: boolean };
type It = {
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
  variants: V[];
};
type Cat = { id: number; slug: string; nameAr: string; nameEn: string; isActive: boolean };

export default function ItemsManager({
  categories,
  items: initialItems,
  addonGroups,
}: {
  categories: Cat[];
  items: It[];
  addonGroups: { id: number; nameAr: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [showOos, setShowOos] = useState(false);
  const [showMissingPrice, setShowMissingPrice] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [priceDialog, setPriceDialog] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const refresh = () => startTransition(() => router.refresh());

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (selectedCat !== null && it.categoryId !== selectedCat) return false;
      if (showOos && it.isAvailable) return false;
      if (showInactive && it.isActive) return false;
      if (showMissingPrice && it.variants.some((v) => v.price !== null)) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${it.nameAr} ${it.nameEn} ${it.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, selectedCat, showOos, showMissingPrice, showInactive, query]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const dndEnabled = selectedCat !== null && !query && !showOos && !showMissingPrice && !showInactive;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || selectedCat === null) return;
    const ids = filtered.map((f) => f.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(filtered, from, to);
    setItems((prev) => {
      const byId = new Map(reordered.map((r, idx) => [r.id, { ...r, sort: idx }]));
      return prev.map((p) => byId.get(p.id) ?? p);
    });
    // reorder within category: merge with items of the same category not visible in filter
    const catItemIds = items.filter((i) => i.categoryId === selectedCat).map((i) => i.id);
    const visibleSet = new Set(reordered.map((r) => r.id));
    const finalOrder = [...reordered.map((r) => r.id), ...catItemIds.filter((id) => !visibleSet.has(id))];
    void bulkReorder(finalOrder);
  };

  const bulkReorder = async (orderedIds: number[]) => {
    await reorderItems(selectedCat!, orderedIds);
    showToast("تم حفظ الترتيب ✓");
  };

  /* ── row actions ── */
  const setPrice = async (variantId: number, value: string) => {
    setItems((prev) => prev.map((it) => ({ ...it, variants: it.variants.map((v) => (v.id === variantId ? { ...v, price: value === "" ? null : value } : v)) })));
    const res = await updateVariant(variantId, { price: value });
    if (res.ok) refresh();
  };

  const setAvailable = async (it: It, available: boolean) => {
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, isAvailable: available } : p)));
    await toggleItemAvailability(it.id, available);
    showToast(available ? `${it.nameAr}: متوفر ✓` : `${it.nameAr}: خلصان`);
  };

  const setActive = async (it: It, active: boolean) => {
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, isActive: active } : p)));
    await toggleItemActive(it.id, active);
    refresh();
  };

  const dup = async (it: It) => {
    const res = await duplicateItem(it.id);
    if (res.ok) {
      showToast("تم النسخ ✓");
      refresh();
    }
  };

  const del = async (it: It) => {
    if (!confirm(`تأكيد حذف "${it.nameAr}"؟\nهتقدر تراجع من سجل العمليات.`)) return;
    await deleteItem(it.id);
    setItems((prev) => prev.filter((p) => p.id !== it.id));
    showToast("اتحذف — تراجع متاح من سجل العمليات");
    refresh();
  };

  const addVariant = async (it: It) => {
    const res = await createVariant(it.id, { nameAr: "حجم جديد", price: "" });
    if (res.ok && res.id) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === it.id ? { ...p, variants: [...p.variants, { id: res.id!, nameAr: "حجم جديد", nameEn: null, price: null, isActive: true, isAvailable: true }] } : p,
        ),
      );
      refresh();
    }
  };

  const delVariant = async (it: It, variantId: number) => {
    await deleteVariant(variantId);
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p)));
    refresh();
  };

  const toggleVariantAvail = async (v: V, available: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, variants: it.variants.map((x) => (x.id === v.id ? { ...x, isAvailable: available } : x)) })));
    await toggleVariantAvailability(v.id, available);
  };

  const setBadge = async (it: It, badge: string, on: boolean) => {
    const badges = on ? [...new Set([...it.badges, badge])] : it.badges.filter((b) => b !== badge);
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, badges } : p)));
    await updateItem(it.id, { badges });
    refresh();
  };

  /* ── bulk actions ── */
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const selectAllVisible = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((f) => f.id))));
  };

  const runBulk = async (fn: () => Promise<unknown>, msg: string) => {
    await fn();
    setSelected(new Set());
    showToast(msg);
    refresh();
  };

  const addItem = async () => {
    const catId = selectedCat ?? categories[0]?.id;
    if (!catId) {
      alert("اعمل قسم الأول من صفحة الأقسام");
      return;
    }
    const res = await createItem(catId, "صنف جديد");
    if (res.ok && res.id) router.push(`/admin/items/${res.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-3.5 flex flex-wrap items-center gap-2">
        <button onClick={addItem} disabled={busy} className="btn btn-primary btn-sm">
          <Plus size={14} /> صنف جديد
        </button>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-40" />
          <input className="inp inp-sm !ps-8" placeholder="بحث…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <FilterChip active={showOos} onClick={() => setShowOos(!showOos)} label="خلصان" />
        <FilterChip active={showMissingPrice} onClick={() => setShowMissingPrice(!showMissingPrice)} label="ناقصة سعر" />
        <FilterChip active={showInactive} onClick={() => setShowInactive(!showInactive)} label="مخفية" />
        <button onClick={() => setPriceDialog(true)} className="btn btn-ghost btn-sm !text-amber-600">
          <Percent size={14} /> تعديل أسعار جماعي
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-2 border-amber-400/50" style={{ borderColor: "var(--brand-accent)" }}>
          <span className="chip chip-accent">{selected.size} محدد</span>
          <button className="btn btn-ghost btn-sm" onClick={() => runBulk(() => bulkSetAvailability([...selected], false), "اتعلّمت كخلصان")}>
            خلصان
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => runBulk(() => bulkSetAvailability([...selected], true), "رجعوا متوفرين")}>
            متوفر
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => runBulk(() => bulkSetActive([...selected], false), "اتخفوا من المنيو")}>
            <EyeOff size={13} /> إخفاء
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => runBulk(() => bulkSetActive([...selected], true), "ظهرت في المنيو")}>
            إظهار
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (!confirm(`تأكيد حذف ${selected.size} صنف؟ التراجع متاح من سجل العمليات.`)) return;
              runBulk(() => bulkDeleteItems([...selected]), "اتحذفوا — التراجع متاح");
            }}
          >
            <Trash2 size={13} /> حذف
          </button>
          <button className="btn btn-ghost btn-sm ms-auto" onClick={() => setSelected(new Set())}>
            إلغاء التحديد
          </button>
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* Category sidebar */}
        <aside className="card p-2.5 w-44 shrink-0 hidden md:block sticky top-4">
          <button
            onClick={() => setSelectedCat(null)}
            className={`admin-nav-link !py-2 !text-[13px] w-full ${selectedCat === null ? "active" : ""}`}
          >
            كل الأصناف
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`admin-nav-link !py-2 !text-[13px] w-full justify-between ${selectedCat === c.id ? "active" : ""}`}
            >
              <span className="truncate">{c.nameAr}</span>
              <span className="text-[11px] opacity-60">{items.filter((i) => i.categoryId === c.id).length}</span>
            </button>
          ))}
        </aside>

        {/* Items table */}
        <div className="card flex-1 min-w-0 overflow-hidden">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {dndEnabled && <th className="w-8" />}
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={selectAllVisible}
                      className="w-3.5 h-3.5"
                    />
                  </th>
                  <th>الصنف</th>
                  <th className="min-w-[200px]">الأسعار</th>
                  <th>متوفر</th>
                  <th>ظاهر</th>
                  <th className="w-28">إجراءات</th>
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy} disabled={!dndEnabled}>
                  <tbody>
                    {filtered.map((it) => (
                      <ItemRow
                        key={it.id}
                        it={it}
                        catName={catMap.get(it.categoryId)?.nameAr ?? "—"}
                        dndEnabled={dndEnabled}
                        selected={selected.has(it.id)}
                        onToggleSelect={() => toggleSelect(it.id)}
                        expanded={expanded.has(it.id)}
                        onToggleExpand={() =>
                          setExpanded((prev) => {
                            const n = new Set(prev);
                            if (n.has(it.id)) n.delete(it.id);
                            else n.add(it.id);
                            return n;
                          })
                        }
                        onSetPrice={setPrice}
                        onSetAvailable={() => setAvailable(it, !it.isAvailable)}
                        onSetActive={() => setActive(it, !it.isActive)}
                        onDuplicate={() => dup(it)}
                        onDelete={() => del(it)}
                        onAddVariant={() => addVariant(it)}
                        onDeleteVariant={(vid) => delVariant(it, vid)}
                        onToggleVariantAvail={toggleVariantAvail}
                        onSetBadge={(b, on) => setBadge(it, b, on)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
            {filtered.length === 0 && (
              <p className="text-center py-10 text-[13.5px]" style={{ color: "var(--ink-faint)" }}>
                {items.length === 0 ? "مفيش أصناف — ابدأ بزر «صنف جديد» أو استورد منيو كامل من مركز الاستيراد" : "مفيش نتائج مطابقة للفلاتر"}
              </p>
            )}
          </div>
        </div>
      </div>

      {priceDialog && (
        <BulkPriceDialog
          categoryId={selectedCat}
          categoryHint={selectedCat !== null ? catMap.get(selectedCat)?.nameAr ?? null : null}
          selectedCount={selected.size}
          items={items}
          selected={selected}
          onClose={() => setPriceDialog(false)}
          onDone={(msg) => {
            setPriceDialog(false);
            setSelected(new Set());
            showToast(msg);
            refresh();
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ── Row ── */

function ItemRow({
  it,
  catName,
  dndEnabled,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  onSetPrice,
  onSetAvailable,
  onSetActive,
  onDuplicate,
  onDelete,
  onAddVariant,
  onDeleteVariant,
  onToggleVariantAvail,
  onSetBadge,
}: {
  it: It;
  catName: string;
  dndEnabled: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onSetPrice: (variantId: number, value: string) => Promise<void>;
  onSetAvailable: () => Promise<void>;
  onSetActive: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onAddVariant: () => Promise<void>;
  onDeleteVariant: (itemId: number, vid: number) => Promise<void>;
  onToggleVariantAvail: (v: V, available: boolean) => Promise<void>;
  onSetBadge: (badge: string, on: boolean) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: it.id, disabled: !dndEnabled });
  const [showBadges, setShowBadges] = useState(false);

  return (
    <>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={isDragging ? "dragging-row" : ""}
      >
        {dndEnabled && (
          <td>
            <span className="drag-handle inline-block" {...attributes} {...listeners}>
              <GripVertical size={15} />
            </span>
          </td>
        )}
        <td>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-3.5 h-3.5" />
        </td>
        <td className="max-w-[240px]">
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleExpand} className="opacity-40 hover:opacity-100" title="الأسعار التفصيلية">
              <ChevronDown size={14} className={expanded ? "rotate-180" : ""} style={{ transition: "transform .15s" }} />
            </button>
            <div className="min-w-0">
              <p className="font-bold truncate">
                {it.nameAr} {!it.isAvailable && <span className="oos-tag">خلصان</span>} {!it.isActive && <span className="chip">مخفي</span>}
              </p>
              <p className="text-[11.5px] opacity-50 truncate">
                {catName} · <span dir="ltr">{it.code}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap relative">
            {it.badges.map((b) => (
              <span key={b} className="chip !py-0.5 !text-[10.5px]">
                {BADGE_LABELS_AR[b as keyof typeof BADGE_LABELS_AR] ?? b}
              </span>
            ))}
            <button
              onClick={() => setShowBadges(!showBadges)}
              className="chip !py-0.5 !text-[10.5px] hover:!border-amber-400"
              title="تحديد الشارات"
            >
              شارات +
            </button>
            {showBadges && (
              <div className="absolute z-30 top-full mt-1 card p-2 shadow-xl grid grid-cols-2 gap-1 w-56" dir="rtl">
                {BADGES.map((b) => (
                  <label key={b} className="flex items-center gap-1.5 text-[12px] font-bold cursor-pointer p-1 rounded hover:bg-black/5">
                    <input
                      type="checkbox"
                      checked={it.badges.includes(b)}
                      onChange={(e) => onSetBadge(b, e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {BADGE_LABELS_AR[b]}
                  </label>
                ))}
              </div>
            )}
          </div>
        </td>
        <td>
          <div className="flex flex-wrap gap-1.5">
            {it.variants.length === 0 && <span className="text-[12px] opacity-40">بدون أسعار</span>}
            {it.variants.slice(0, 2).map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1">
                {v.nameAr && <span className="text-[11.5px] opacity-60">{v.nameAr}</span>}
                <input
                  className="inp inp-sm !w-16 text-center font-bold"
                  defaultValue={v.price ?? ""}
                  placeholder="—"
                  inputMode="decimal"
                  dir="ltr"
                  onBlur={(e) => {
                    if (e.target.value !== (v.price ?? "")) onSetPrice(v.id, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  title={v.isAvailable ? "" : "غير متوفر"}
                  style={v.isAvailable ? undefined : { textDecoration: "line-through", opacity: 0.5 }}
                />
              </span>
            ))}
            {it.variants.length > 2 && <span className="chip !py-0.5">+{it.variants.length - 2}</span>}
          </div>
        </td>
        <td>
          <label className="switch">
            <input type="checkbox" checked={it.isAvailable} onChange={onSetAvailable} />
            <span className="track" />
          </label>
        </td>
        <td>
          <label className="switch">
            <input type="checkbox" checked={it.isActive} onChange={onSetActive} />
            <span className="track" />
          </label>
        </td>
        <td>
          <div className="flex items-center gap-1">
            <Link href={`/admin/items/${it.id}`} className="btn btn-ghost btn-sm !p-1.5" title="تحرير كامل">
              <Pencil size={13} />
            </Link>
            <button onClick={onDuplicate} className="btn btn-ghost btn-sm !p-1.5" title="نسخ">
              <Copy size={13} />
            </button>
            <button onClick={onDelete} className="btn btn-ghost btn-sm !p-1.5 !text-red-500" title="حذف">
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={dndEnabled ? 7 : 6} className="!py-3" style={{ background: "color-mix(in srgb, var(--brand-accent) 3%, transparent)" }}>
            <div className="ps-6 space-y-2">
              {it.variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    className="inp inp-sm !w-40"
                    defaultValue={v.nameAr ?? ""}
                    placeholder="اسم الخيار"
                    onBlur={(e) => {
                      if (e.target.value !== (v.nameAr ?? "")) void updateVariant(v.id, { nameAr: e.target.value }).then(() => null);
                    }}
                  />
                  <input
                    className="inp inp-sm !w-24 text-center"
                    defaultValue={v.price ?? ""}
                    placeholder="السعر"
                    inputMode="decimal"
                    dir="ltr"
                    onBlur={(e) => {
                      if (e.target.value !== (v.price ?? "")) void onSetPrice(v.id, e.target.value);
                    }}
                  />
                  <label className="flex items-center gap-1.5 text-[12px] cursor-pointer select-none">
                    <input type="checkbox" checked={v.isAvailable} onChange={(e) => onToggleVariantAvail(v, e.target.checked)} className="w-3.5 h-3.5" />
                    متوفر
                  </label>
                  <button onClick={() => onDeleteVariant(it.id, v.id)} className="btn btn-ghost btn-sm !p-1 !text-red-500">
                    <CircleSlash size={12} />
                  </button>
                </div>
              ))}
              <button onClick={onAddVariant} className="btn btn-ghost btn-sm">
                <Plus size={13} /> خيار سعر جديد
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`chip ${active ? "chip-accent" : ""}`}>
      {label}
    </button>
  );
}

/* ── Bulk price dialog ── */

function BulkPriceDialog({
  categoryId,
  categoryHint,
  selectedCount,
  items,
  selected,
  onClose,
  onDone,
}: {
  categoryId: number | null;
  categoryHint: string | null;
  selectedCount: number;
  items: It[];
  selected: Set<number>;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [scope, setScope] = useState<"selected" | "category" | "all">(selectedCount > 0 ? "selected" : categoryId !== null ? "category" : "all");
  const [opType, setOpType] = useState<"percent" | "fixed_add" | "set">("percent");
  const [value, setValue] = useState("10");
  const [rounding, setRounding] = useState("1");
  const [busy, setBusy] = useState(false);

  const val = parseFloat(value) || 0;
  const round = parseFloat(rounding) || 0;

  const targetItems = useMemo(() => {
    if (scope === "selected") return items.filter((i) => selected.has(i.id));
    if (scope === "category" && categoryId !== null) return items.filter((i) => i.categoryId === categoryId);
    return items;
  }, [scope, items, selected, categoryId]);

  const affected = targetItems.flatMap((i) => i.variants.filter((v) => v.price !== null));
  const samples = affected.slice(0, 3).map((v) => {
    const p = parseFloat(v.price!);
    let next = opType === "percent" ? p * (1 + val / 100) : opType === "fixed_add" ? p + val : val;
    if (round > 0) next = Math.round(next / round) * round;
    next = Math.max(0, parseFloat(next.toFixed(2)));
    return { before: p, after: next };
  });

  const run = async () => {
    setBusy(true);
    const scopeArg =
      scope === "selected"
        ? { type: "items" as const, ids: [...selected] }
        : scope === "category" && categoryId !== null
          ? { type: "categories" as const, ids: [categoryId] }
          : { type: "all" as const };
    const res = await bulkPrice(scopeArg, { type: opType, value: val }, round);
    setBusy(false);
    onDone(`اتعدل ${res.changed} سعر — التراجع متاح من سجل العمليات`);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold text-lg mb-1">تعديل أسعار جماعي</h3>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-faint)" }}>
          بيشتغل على كل الأسعار الموجودة في النطاق — الأصناف اللي ملهاش سعر بتتجاهل. التراجع متاح بعد التنفيذ.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[12.5px] font-bold mb-1.5">النطاق</p>
            <div className="flex flex-wrap gap-2">
              <ScopeRadio label={`المحدد (${selectedCount})`} value="selected" current={scope} disabled={selectedCount === 0} onChange={setScope} />
              {categoryHint && categoryId !== null && (
                <ScopeRadio label={`القسم: ${categoryHint}`} value="category" current={scope} onChange={setScope} />
              )}
              <ScopeRadio label="كل المنيو" value="all" current={scope} onChange={setScope} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">العملية</span>
              <select className="inp" value={opType} onChange={(e) => setOpType(e.target.value as never)}>
                <option value="percent">زيادة/نقص بالنسبة %</option>
                <option value="fixed_add">زيادة/نقص مبلغ ثابت</option>
                <option value="set">تثبيت سعر محدد</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12.5px] font-bold mb-1 block">
                القيمة {opType === "percent" ? "(% — سالب للخصم)" : opType === "fixed_add" ? "(ج.م — سالب للخصم)" : "(ج.م)"}
              </span>
              <input className="inp" dir="ltr" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">التقريب</span>
            <select className="inp" value={rounding} onChange={(e) => setRounding(e.target.value)}>
              <option value="0">بدون تقريب</option>
              <option value="0.5">أقرب نصف جنيه</option>
              <option value="1">أقرب جنيه</option>
              <option value="5">أقرب 5 جنيه</option>
            </select>
          </label>

          {/* Confirm preview: count + 3 samples */}
          <div className="rounded-xl border p-3 text-[13px]" style={{ borderColor: "var(--line)", background: "var(--paper)" }}>
            <p className="font-extrabold mb-1.5">
              هيتم تعديل <span style={{ color: "var(--brand-accent)" }}>{affected.length}</span> سعر
            </p>
            {samples.map((s, i) => (
              <p key={i} className="flex items-center gap-2 py-0.5">
                <span dir="ltr" className="opacity-60 line-through">{s.before}</span>
                <span>←</span>
                <span dir="ltr" className="font-extrabold" style={{ color: "var(--brand-accent)" }}>
                  {s.after}
                </span>
              </p>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="btn btn-ghost">
              إلغاء
            </button>
            <button onClick={run} disabled={busy || affected.length === 0} className="btn btn-primary">
              {busy ? "بيعدل…" : `تطبيق على ${affected.length} سعر`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeRadio({
  label,
  value,
  current,
  disabled,
  onChange,
}: {
  label: string;
  value: "selected" | "category" | "all";
  current: string;
  disabled?: boolean;
  onChange: (v: "selected" | "category" | "all") => void;
}) {
  return (
    <label className={`chip cursor-pointer ${current === value ? "chip-accent" : ""} ${disabled ? "opacity-40" : ""}`}>
      <input
        type="radio"
        name="bulk-scope"
        className="hidden"
        disabled={disabled}
        checked={current === value}
        onChange={() => onChange(value)}
      />
      {label}
    </label>
  );
}
