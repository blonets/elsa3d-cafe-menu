import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  addonGroups,
  addons,
  categories,
  itemAddonGroups,
  items,
  variants,
  audits,
} from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DATE_FIELDS = new Set(["createdAt", "updatedAt", "announcementExpiresAt", "undoneAt"]);

/** JSON snapshots store Dates as strings — revive them before re-inserting. */
export function reviveDates<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of Object.keys(out)) {
    if (DATE_FIELDS.has(k) && typeof out[k] === "string") {
      out[k] = new Date(out[k] as string);
    }
  }
  return out as T;
}

/** Full-catalog snapshot used for import/bulk undo. */
export type CatalogSnapshot = {
  categories: unknown[];
  items: unknown[];
  variants: unknown[];
  addonGroups: unknown[];
  addons: unknown[];
  itemAddonGroups: unknown[];
};

export async function snapshotCatalog(): Promise<CatalogSnapshot> {
  return {
    categories: await db.select().from(categories).orderBy(asc(categories.id)),
    items: await db.select().from(items).orderBy(asc(items.id)),
    variants: await db.select().from(variants).orderBy(asc(variants.id)),
    addonGroups: await db.select().from(addonGroups).orderBy(asc(addonGroups.id)),
    addons: await db.select().from(addons).orderBy(asc(addons.id)),
    itemAddonGroups: await db.select().from(itemAddonGroups),
  };
}

/**
 * Restore a full catalog snapshot inside a transaction.
 * Preserves original ids and resets sequences afterwards.
 */
export async function restoreCatalogTx(tx: Tx, snap: CatalogSnapshot): Promise<void> {
  await tx.delete(itemAddonGroups);
  await tx.delete(addons);
  await tx.delete(addonGroups);
  await tx.delete(variants);
  await tx.delete(items);
  await tx.delete(categories);

  for (const r of snap.categories as (typeof categories.$inferInsert)[]) await tx.insert(categories).values(reviveDates(r));
  for (const r of snap.items as (typeof items.$inferInsert)[]) await tx.insert(items).values(reviveDates(r));
  for (const r of snap.variants as (typeof variants.$inferInsert)[]) await tx.insert(variants).values(reviveDates(r));
  for (const r of snap.addonGroups as (typeof addonGroups.$inferInsert)[]) await tx.insert(addonGroups).values(reviveDates(r));
  for (const r of snap.addons as (typeof addons.$inferInsert)[]) await tx.insert(addons).values(reviveDates(r));
  for (const r of snap.itemAddonGroups as (typeof itemAddonGroups.$inferInsert)[]) await tx.insert(itemAddonGroups).values(r);

  const seqFix = async (table: string) => {
    await tx.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
      ),
    );
  };
  await seqFix("categories");
  await seqFix("items");
  await seqFix("variants");
  await seqFix("addon_groups");
  await seqFix("addons");
}

export async function writeAudit(entry: {
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
}): Promise<number> {
  const [row] = await db
    .insert(audits)
    .values({
      actor: "admin",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      before: entry.before ?? null,
      after: entry.after ?? null,
    })
    .returning({ id: audits.id });
  return row.id;
}

export async function getAuditById(id: number) {
  const rows = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function markAuditUndone(id: number): Promise<void> {
  await db.update(audits).set({ undoneAt: new Date() }).where(eq(audits.id, id));
}
