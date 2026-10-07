import { sql } from "drizzle-orm";
import { db } from "@/db";
import { items, variants } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cairoDay } from "@/lib/analytics";
import DashboardWidgets from "@/components/admin/DashboardWidgets";
import { eq, and, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const s = await getSettings();
  const today = cairoDay();

  // Scans today (Cairo day boundary)
  const scansRes = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM analytics_events
    WHERE type = 'scan' AND (created_at AT TIME ZONE 'Africa/Cairo')::date::text = ${today}
  `);
  const scansToday = firstInt(scansRes);

  // Top viewed last 7 days
  const topRes = await db.execute(sql`
    SELECT e.item_id AS id, COUNT(*)::int AS views, i.name_ar AS name_ar
    FROM analytics_events e
    JOIN items i ON i.id = e.item_id
    WHERE e.type = 'item_view' AND e.created_at > NOW() - INTERVAL '7 days'
    GROUP BY 1, 3 ORDER BY views DESC LIMIT 8
  `);
  const topViewed = (rowsOf(topRes) as { id: number; views: number; name_ar: string }[]) ?? [];

  // Dead items: active, with variants, no views in 30 days
  const deadRes = await db.execute(sql`
    SELECT i.id, i.name_ar FROM items i
    WHERE i.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM analytics_events e
        WHERE e.item_id = i.id AND e.type = 'item_view' AND e.created_at > NOW() - INTERVAL '30 days'
      )
    ORDER BY i.name_ar LIMIT 12
  `);
  const deadItems = (rowsOf(deadRes) as { id: number; name_ar: string }[]) ?? [];

  const totalItems = (await db.select({ id: items.id }).from(items)).length;
  const oosItems = await db
    .select({ id: items.id, nameAr: items.nameAr, nameEn: items.nameEn })
    .from(items)
    .where(and(eq(items.isAvailable, false), eq(items.isActive, true)));
  const allItems = await db.select({ id: items.id }).from(items).where(eq(items.isActive, true));
  const activeVariants = await db
    .select({ id: variants.id, itemId: variants.itemId, price: variants.price })
    .from(variants)
    .where(eq(variants.isActive, true));

  // items missing prices: no variant with a price
  const priced = new Set(activeVariants.filter((v) => v.price !== null).map((v) => v.itemId));
  const missingPriceCount = allItems.filter((i) => !priced.has(i.id)).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="menu-title text-2xl">أهلاً 👋</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          نظرة سريعة على المينيو اليوم
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="مسحات QR اليوم" value={scansToday} accent />
        <StatCard label="إجمالي الأصناف" value={totalItems} />
        <StatCard label="أصناف خلصان" value={oosItems.length} warn={oosItems.length > 0} />
        <StatCard label="ناقصة سعر" value={missingPriceCount} warn={missingPriceCount > 0} />
      </div>

      <DashboardWidgets
        oosItems={oosItems}
        announcement={{ text: s.announcement ?? "", active: s.announcementActive }}
        topViewed={topViewed.map((t) => ({ id: t.id, nameAr: t.name_ar, views: t.views }))}
        deadItems={deadItems.map((d) => ({ id: d.id, nameAr: d.name_ar }))}
      />
    </div>
  );
}

function StatCard({ label, value, warn, accent }: { label: string; value: number; warn?: boolean; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-[12px] font-bold" style={{ color: "var(--ink-faint)" }}>
        {label}
      </p>
      <p
        className={`text-3xl font-extrabold mt-1 ${warn ? "text-red-600" : accent ? "" : ""}`}
        style={!warn && accent ? { color: "var(--brand-accent)" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function rowsOf(res: unknown): unknown[] {
  if (Array.isArray(res)) return res as unknown[];
  return (res as { rows?: unknown[] }).rows ?? [];
}

function firstInt(res: unknown): number {
  const rows = rowsOf(res) as { cnt?: number }[];
  return rows[0]?.cnt ?? 0;
}
