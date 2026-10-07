import "server-only";
import { db } from "@/db";
import { analyticsDaily, analyticsEvents } from "@/db/schema";
import { sql, lt as ltCol } from "drizzle-orm";

let lastPruneDay = "";

/** Local date (Africa/Cairo) as YYYY-MM-DD for a given instant. */
export function cairoDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Roll up events older than 48h into analytics_daily and delete them.
 * Runs at most once per day (Africa/Cairo), guarded in-memory.
 */
export async function maybePrune(): Promise<void> {
  const today = cairoDay();
  if (today === lastPruneDay) return;
  lastPruneDay = today;
  try {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
    const cutoffStr = cairoDay(cutoff);

    await db.transaction(async (tx) => {
      // Aggregate events older than cutoff by Cairo day
      const rows = await tx.execute(sql`
        SELECT (created_at AT TIME ZONE 'Africa/Cairo')::date::text AS day,
               type,
               item_id,
               term,
               COUNT(*)::int AS cnt
        FROM analytics_events
        WHERE created_at < ${cutoff.toISOString()}
        GROUP BY 1, 2, 3, 4
      `);
      const list: unknown[] = Array.isArray(rows)
        ? rows
        : ((rows as unknown as { rows?: unknown[] }).rows ?? []);
      const agg = new Map<string, { scans: number; itemViews: Record<string, number>; searches: Record<string, number> }>();
      for (const r of list as { day: string; type: string; item_id: number | null; term: string | null; cnt: number }[]) {
        const e = agg.get(r.day) ?? { scans: 0, itemViews: {}, searches: {} };
        if (r.type === "scan") e.scans += r.cnt;
        else if (r.type === "item_view" && r.item_id) e.itemViews[String(r.item_id)] = (e.itemViews[String(r.item_id)] ?? 0) + r.cnt;
        else if (r.type === "search" && r.term) e.searches[r.term] = (e.searches[r.term] ?? 0) + r.cnt;
        agg.set(r.day, e);
      }
      for (const [day, e] of agg) {
        await tx
          .insert(analyticsDaily)
          .values({ day, scans: e.scans, itemViews: e.itemViews, topSearches: e.searches })
          .onConflictDoUpdate({
            target: analyticsDaily.day,
            set: {
              scans: sql`${analyticsDaily.scans} + ${e.scans}`,
              itemViews: sql`${analyticsDaily.itemViews} || ${JSON.stringify(e.itemViews)}::jsonb`,
              topSearches: sql`${analyticsDaily.topSearches} || ${JSON.stringify(e.searches)}::jsonb`,
            },
          });
      }
      await tx.delete(analyticsEvents).where(ltCol(analyticsEvents.createdAt, cutoff));
      // keep 400 days of daily rollups
      await tx.execute(sql`DELETE FROM analytics_daily WHERE day < (CURRENT_DATE - INTERVAL '400 days')`);
    });
  } catch (e) {
    console.error("[analytics] prune failed", e);
  }
}
