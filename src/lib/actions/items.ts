"use server";

import { revalidateTag } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, categories, itemAddonGroups, items, variants } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { priceOrNull } from "@/lib/format";
import { BADGES } from "@/lib/badges";

/** Availability toggles intentionally skip menu revalidation (JSON endpoint serves them). */
function refresh() {
  revalidateTag("menu");
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || `item-${Date.now().toString(36)}`
  );
}

async function snapshotDeletedItems(ids: number[]) {
  const itemRows = await db.select().from(items).where(inArray(items.id, ids));
  const varRows = await db.select().from(variants).where(inArray(variants.itemId, ids));
  const linkRows = await db.select().from(itemAddonGroups).where(inArray(itemAddonGroups.itemId, ids));
  const catIds = [...new Set(itemRows.map((i) => i.categoryId))];
  const catRows = catIds.length ? await db.select().from(categories).where(inArray(categories.id, catIds)) : [];
  return { kind: "deleted_items", categories: catRows, items: itemRows, variants: varRows, links: linkRows };
}

export async function createItem(categoryId: number, nameAr: string): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requireAdmin();
  const name = nameAr.trim() || "صنف جديد";
  const [maxSort] = await db
    .select({ s: items.sort })
    .from(items)
    .where(eq(items.categoryId, categoryId))
    .orderBy(asc(items.sort))
    .limit(1);
  void maxSort;
  const count = await db.select({ id: items.id }).from(items).where(eq(items.categoryId, categoryId));
  const base = slugify(name);
  let code = base;
  let n = 2;
  while ((await db.select({ id: items.id }).from(items).where(eq(items.code, code)).limit(1)).length > 0) {
    code = `${base}-${n++}`;
  }
  const [row] = await db
    .insert(items)
    .values({ categoryId, code, nameAr: name, nameEn: name, sort: count.length + 1 })
    .returning({ id: items.id });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateItem(
  id: number,
  patch: {
    nameAr?: string;
    nameEn?: string;
    descAr?: string | null;
    descEn?: string | null;
    badges?: string[];
    prepNote?: string | null;
    categoryId?: number;
    isActive?: boolean;
  },
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (patch.badges) patch.badges = patch.badges.filter((b) => (BADGES as readonly string[]).includes(b));
  await db.update(items).set(patch).where(eq(items.id, id));
  refresh();
  return { ok: true };
}

export async function deleteItem(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  const before = await snapshotDeletedItems([id]);
  await writeAudit({
    action: "item.delete",
    entityType: "item",
    entityId: String(id),
    summary: `حذف الصنف: ${(before.items[0] as { nameAr?: string })?.nameAr ?? id}`,
    before,
  });
  await db.delete(items).where(eq(items.id, id));
  refresh();
  return { ok: true };
}

export async function duplicateItem(id: number): Promise<{ ok: boolean; id?: number }> {
  await requireAdmin();
  const [src] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!src) return { ok: false };
  const srcVariants = await db.select().from(variants).where(eq(variants.itemId, id));
  const srcLinks = await db.select().from(itemAddonGroups).where(eq(itemAddonGroups.itemId, id));

  let code = `${src.code}-copy`;
  let n = 2;
  while ((await db.select({ id: items.id }).from(items).where(eq(items.code, code)).limit(1)).length > 0) {
    code = `${src.code}-copy-${n++}`;
  }
  const [row] = await db
    .insert(items)
    .values({
      categoryId: src.categoryId,
      code,
      nameAr: `${src.nameAr} (نسخة)`,
      nameEn: `${src.nameEn} (copy)`,
      descAr: src.descAr,
      descEn: src.descEn,
      badges: src.badges,
      prepNote: src.prepNote,
      sort: src.sort + 1,
      isActive: src.isActive,
      isAvailable: src.isAvailable,
    })
    .returning({ id: items.id });
  for (const v of srcVariants) {
    await db.insert(variants).values({
      itemId: row.id,
      nameAr: v.nameAr,
      nameEn: v.nameEn,
      price: v.price,
      sort: v.sort,
      isActive: v.isActive,
      isAvailable: v.isAvailable,
    });
  }
  for (const l of srcLinks) {
    await db.insert(itemAddonGroups).values({ itemId: row.id, groupId: l.groupId }).onConflictDoNothing();
  }
  refresh();
  return { ok: true, id: row.id };
}

export async function toggleItemAvailability(id: number, available: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.update(items).set({ isAvailable: available }).where(eq(items.id, id));
  return { ok: true };
}

export async function toggleItemActive(id: number, active: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.update(items).set({ isActive: active }).where(eq(items.id, id));
  refresh();
  return { ok: true };
}

export async function reorderItems(categoryId: number, orderedIds: number[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(items).set({ sort: i + 1 }).where(and(eq(items.id, orderedIds[i]), eq(items.categoryId, categoryId)));
  }
  refresh();
  return { ok: true };
}

/* ── Variants ── */

export async function createVariant(
  itemId: number,
  data: { nameAr?: string; nameEn?: string; price?: string | null },
): Promise<{ ok: boolean; id?: number }> {
  await requireAdmin();
  const count = await db.select({ id: variants.id }).from(variants).where(eq(variants.itemId, itemId));
  const [row] = await db
    .insert(variants)
    .values({
      itemId,
      nameAr: data.nameAr || null,
      nameEn: data.nameEn || null,
      price: priceOrNull(data.price),
      sort: count.length + 1,
    })
    .returning({ id: variants.id });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateVariant(
  id: number,
  patch: { nameAr?: string | null; nameEn?: string | null; price?: string | null; isActive?: boolean },
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const set: Record<string, unknown> = {};
  if ("nameAr" in patch) set.nameAr = patch.nameAr || null;
  if ("nameEn" in patch) set.nameEn = patch.nameEn || null;
  if ("price" in patch) set.price = priceOrNull(patch.price);
  if ("isActive" in patch) set.isActive = patch.isActive;
  await db.update(variants).set(set).where(eq(variants.id, id));
  refresh();
  return { ok: true };
}

export async function toggleVariantAvailability(id: number, available: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.update(variants).set({ isAvailable: available }).where(eq(variants.id, id));
  return { ok: true };
}

export async function deleteVariant(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(variants).where(eq(variants.id, id));
  refresh();
  return { ok: true };
}

/* ── Add-on links per item ── */

export async function setItemAddonGroups(itemId: number, groupIds: number[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(itemAddonGroups).where(eq(itemAddonGroups.itemId, itemId));
  const valid = groupIds.length ? await db.select({ id: addonGroups.id }).from(addonGroups).where(inArray(addonGroups.id, groupIds)) : [];
  for (const g of valid) {
    await db.insert(itemAddonGroups).values({ itemId, groupId: g.id }).onConflictDoNothing();
  }
  refresh();
  return { ok: true };
}

/* ── Bulk operations ── */

export async function bulkSetAvailability(ids: number[], available: boolean): Promise<{ ok: boolean; count: number }> {
  await requireAdmin();
  if (!ids.length) return { ok: true, count: 0 };
  await db.update(items).set({ isAvailable: available }).where(inArray(items.id, ids));
  return { ok: true, count: ids.length };
}

export async function bulkSetActive(ids: number[], active: boolean): Promise<{ ok: boolean; count: number }> {
  await requireAdmin();
  if (!ids.length) return { ok: true, count: 0 };
  await db.update(items).set({ isActive: active }).where(inArray(items.id, ids));
  refresh();
  return { ok: true, count: ids.length };
}

export async function bulkDeleteItems(ids: number[]): Promise<{ ok: boolean; count: number; auditId?: number }> {
  await requireAdmin();
  if (!ids.length) return { ok: true, count: 0 };
  const before = await snapshotDeletedItems(ids);
  const names = (before.items as { nameAr: string }[]).slice(0, 3).map((i) => i.nameAr).join("، ");
  const auditId = await writeAudit({
    action: "items.bulk_delete",
    entityType: "item",
    summary: `حذف ${ids.length} صنف: ${names}${ids.length > 3 ? "…" : ""}`,
    before,
  });
  await db.delete(items).where(inArray(items.id, ids));
  refresh();
  return { ok: true, count: ids.length, auditId };
}

export type BulkPriceOp = { type: "percent" | "fixed_add" | "set"; value: number };

export async function bulkPrice(
  scope: { type: "items"; ids: number[] } | { type: "categories"; ids: number[] } | { type: "all" },
  op: BulkPriceOp,
  rounding: number,
): Promise<{ ok: boolean; changed: number; skippedItems: number; auditId?: number; error?: string }> {
  await requireAdmin();

  // Resolve target item ids
  let itemIds: number[];
  if (scope.type === "items") itemIds = scope.ids;
  else if (scope.type === "categories")
    itemIds = (await db.select({ id: items.id }).from(items).where(inArray(items.categoryId, scope.ids))).map((r) => r.id);
  else itemIds = (await db.select({ id: items.id }).from(items)).map((r) => r.id);

  if (!itemIds.length) return { ok: true, changed: 0, skippedItems: 0 };

  const allVariants = await db.select().from(variants).where(inArray(variants.itemId, itemIds));
  const beforeRows = allVariants.map((v) => ({ id: v.id, price: v.price }));
  let changed = 0;

  await db.transaction(async (tx) => {
    for (const v of allVariants) {
      if (v.price === null) continue;
      const p = parseFloat(v.price);
      let next: number;
      if (op.type === "percent") next = p * (1 + op.value / 100);
      else if (op.type === "fixed_add") next = p + op.value;
      else next = op.value;
      if (next < 0) next = 0;
      if (rounding > 0) next = Math.round(next / rounding) * rounding;
      next = parseFloat(next.toFixed(2));
      if (next !== p) {
        await tx.update(variants).set({ price: next.toFixed(2) }).where(eq(variants.id, v.id));
        changed++;
      }
    }
  });

  const skippedItems = new Set(allVariants.filter((v) => v.price === null).map((v) => v.itemId)).size;
  const auditId = await writeAudit({
    action: "pricing.bulk",
    entityType: "variant",
    summary: `تعديل جماعي للأسعار (${op.type === "percent" ? `${op.value > 0 ? "+" : ""}${op.value}%` : op.type === "fixed_add" ? `${op.value > 0 ? "+" : ""}${op.value} ج.م` : `تثبيت ${op.value} ج.م`})`,
    before: { kind: "variant_prices", rows: beforeRows },
    after: { changed, op, rounding, itemIds: itemIds.length },
  });
  refresh();
  return { ok: true, changed, skippedItems, auditId };
}
