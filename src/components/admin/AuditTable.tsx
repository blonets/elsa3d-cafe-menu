"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { undoOperation } from "@/lib/actions/settings";

type Row = {
  id: number;
  action: string;
  summary: string | null;
  undone: boolean;
  canUndo: boolean;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "import.merge": "استيراد (دمج)",
  "import.replace": "استيراد (استبدال كامل)",
  "pricing.bulk": "تعديل أسعار جماعي",
  "items.bulk_delete": "حذف أصناف جماعي",
  "item.delete": "حذف صنف",
  "category.delete": "حذف قسم",
  "addon_group.delete": "حذف مجموعة إضافات",
  "auth.login": "دخول",
  "auth.login_failed": "محاولة دخول فاشلة",
  "settings.password": "تغيير كلمة السر",
};

const UNDOABLE = new Set(["import.merge", "import.replace", "pricing.bulk", "items.bulk_delete", "item.delete", "category.delete"]);

export default function AuditTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "imports") return rows.filter((r) => r.action.startsWith("import."));
    if (filter === "pricing") return rows.filter((r) => r.action === "pricing.bulk");
    if (filter === "deletes") return rows.filter((r) => r.action.includes("delete"));
    if (filter === "auth") return rows.filter((r) => r.action.startsWith("auth."));
    return rows;
  }, [rows, filter]);

  const undo = async (id: number) => {
    const res = await undoOperation(id);
    setMsg(res.message);
    setTimeout(() => setMsg(""), 3000);
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          { k: "all", l: "الكل" },
          { k: "imports", l: "الاستيراد" },
          { k: "pricing", l: "الأسعار" },
          { k: "deletes", l: "الحذف" },
          { k: "auth", l: "الدخول" },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`chip ${filter === f.k ? "chip-accent" : ""}`}>
            {f.l}
          </button>
        ))}
      </div>

      {msg && <p className="text-[13px] font-bold text-green-600">{msg}</p>}

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>العملية</th>
                <th>التفاصيل</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap opacity-70 text-[12px]">{new Date(r.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="font-bold whitespace-nowrap">{ACTION_LABELS[r.action] ?? r.action}</td>
                  <td className="opacity-80">{r.summary}</td>
                  <td>
                    {UNDOABLE.has(r.action) && r.canUndo && !r.undone && (
                      <button onClick={() => undo(r.id)} disabled={pending} className="btn btn-ghost btn-sm !text-amber-600">
                        <Undo2 size={12} /> تراجع
                      </button>
                    )}
                    {r.undone && <span className="chip">تم التراجع</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-[13px]" style={{ color: "var(--ink-faint)" }}>
              مفيش عمليات مسجلة هنا لسه
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
