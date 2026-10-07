"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createAddonGroup, createAddon, deleteAddon, deleteAddonGroup, updateAddon, updateAddonGroup } from "@/lib/actions/catalog";

type Addon = { id: number; nameAr: string; nameEn: string; priceDelta: string; isAvailable: boolean };
type Group = {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
  addons: Addon[];
};

export default function AddonsManager({ groups: initial }: { groups: Group[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };
  const refresh = () => startTransition(() => router.refresh());

  const addGroup = async () => {
    const res = await createAddonGroup("مجموعة إضافات");
    if (res.ok) {
      refresh();
      flash("اتضافت مجموعة — عدّلها وحفظ");
    }
  };

  const saveGroup = async (id: number, p: Partial<Group>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...p } : g)));
    const res = await updateAddonGroup(id, p);
    if (res.error) flash(res.error);
    else refresh();
  };

  const removeGroup = async (g: Group) => {
    if (!confirm(`حذف مجموعة "${g.nameAr}" وكل إضافاتها؟`)) return;
    await deleteAddonGroup(g.id);
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    refresh();
  };

  const addAddon = async (groupId: number) => {
    const res = await createAddon(groupId, { nameAr: "إضافة جديدة" });
    if (res.ok && res.id) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, addons: [...g.addons, { id: res.id!, nameAr: "إضافة جديدة", nameEn: "", priceDelta: "0.00", isAvailable: true }] } : g)),
      );
      refresh();
    }
  };

  const saveAddon = async (groupId: number, id: number, p: Partial<Addon>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, addons: g.addons.map((a) => (a.id === id ? { ...a, ...p } : a)) } : g)));
    await updateAddon(id, p);
    refresh();
  };

  const removeAddon = async (groupId: number, id: number) => {
    await deleteAddon(id);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, addons: g.addons.filter((a) => a.id !== id) } : g)));
    refresh();
  };

  return (
    <div className="space-y-4">
      <button onClick={addGroup} disabled={pending} className="btn btn-primary btn-sm">
        <Plus size={14} /> مجموعة جديدة
      </button>

      {groups.map((g) => (
        <div key={g.id} className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="inp inp-sm !w-44 font-bold"
              value={g.nameAr}
              onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, nameAr: e.target.value } : x)))}
              onBlur={(e) => saveGroup(g.id, { nameAr: e.target.value })}
            />
            <input
              className="inp inp-sm !w-44"
              dir="ltr"
              value={g.nameEn}
              onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, nameEn: e.target.value } : x)))}
              onBlur={(e) => saveGroup(g.id, { nameEn: e.target.value })}
            />
            <label className="flex items-center gap-1 text-[12.5px] font-bold">
              أقل اختيار
              <input
                type="number"
                min={0}
                className="inp inp-sm !w-16 text-center"
                value={g.minSelect}
                onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, minSelect: Number(e.target.value) } : x)))}
                onBlur={(e) => saveGroup(g.id, { minSelect: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-1 text-[12.5px] font-bold">
              أقصى اختيار
              <input
                type="number"
                min={0}
                className="inp inp-sm !w-16 text-center"
                value={g.maxSelect}
                onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, maxSelect: Number(e.target.value) } : x)))}
                onBlur={(e) => saveGroup(g.id, { maxSelect: Number(e.target.value) })}
              />
              <span className="opacity-40">(0 = بلا حدود)</span>
            </label>
            <label className="flex items-center gap-1.5 text-[12.5px] font-bold cursor-pointer select-none">
              <input type="checkbox" checked={g.isActive} onChange={(e) => saveGroup(g.id, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
              مفعّلة
            </label>
            <button onClick={() => removeGroup(g)} className="btn btn-ghost btn-sm !p-1.5 !text-red-500 ms-auto">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="space-y-2 ps-2 border-s-2" style={{ borderColor: "var(--line)" }}>
            {g.addons.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <input
                  className="inp inp-sm !w-36"
                  value={a.nameAr}
                  onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, addons: x.addons.map((y) => (y.id === a.id ? { ...y, nameAr: e.target.value } : y)) } : x)))}
                  onBlur={(e) => saveAddon(g.id, a.id, { nameAr: e.target.value })}
                />
                <input
                  className="inp inp-sm !w-36"
                  dir="ltr"
                  value={a.nameEn}
                  placeholder="Name (EN)"
                  onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, addons: x.addons.map((y) => (y.id === a.id ? { ...y, nameEn: e.target.value } : y)) } : x)))}
                  onBlur={(e) => saveAddon(g.id, a.id, { nameEn: e.target.value })}
                />
                <label className="flex items-center gap-1 text-[12.5px] font-bold">
                  +
                  <input
                    className="inp inp-sm !w-16 text-center"
                    dir="ltr"
                    inputMode="decimal"
                    value={a.priceDelta}
                    onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, addons: x.addons.map((y) => (y.id === a.id ? { ...y, priceDelta: e.target.value } : y)) } : x)))}
                    onBlur={(e) => saveAddon(g.id, a.id, { priceDelta: e.target.value })}
                  />
                  ج.م
                </label>
                <label className="flex items-center gap-1.5 text-[12px] font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={a.isAvailable}
                    onChange={(e) => {
                      setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, addons: x.addons.map((y) => (y.id === a.id ? { ...y, isAvailable: e.target.checked } : y)) } : x)));
                      void import("@/lib/actions/catalog").then((m) => m.toggleAddonAvailability(a.id, e.target.checked));
                    }}
                    className="w-3.5 h-3.5"
                  />
                  متوفرة
                </label>
                <button onClick={() => removeAddon(g.id, a.id)} className="btn btn-ghost btn-sm !p-1 !text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => addAddon(g.id)} className="btn btn-ghost btn-sm">
              <Plus size={12} /> إضافة جديدة
            </button>
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-center py-10 text-[13.5px]" style={{ color: "var(--ink-faint)" }}>
          مفيش مجموعات إضافات — ابدأ بزر «مجموعة جديدة»
        </p>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
