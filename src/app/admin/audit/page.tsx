import { desc } from "drizzle-orm";
import { db } from "@/db";
import { audits } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import AuditTable from "@/components/admin/AuditTable";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();
  const rows = await db.select().from(audits).orderBy(desc(audits.id)).limit(200);

  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">سجل العمليات</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          كل عمليات الحذف والاستيراد والتعديل الجماعي مسجلة — والتراجع متاح بضغطة
        </p>
      </header>
      <AuditTable
        rows={rows.map((r) => ({
          id: r.id,
          action: r.action,
          summary: r.summary,
          undone: Boolean(r.undoneAt),
          canUndo: Boolean(r.before),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
