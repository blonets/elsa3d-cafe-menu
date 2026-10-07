"use server";

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, addons, categories, items } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { CATEGORY_ICON_KEYS } from "@/lib/icons";

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
      .slice(0, 60) || `cat-${Date.now().toString(36)}`
  );
}

/* ── Categories ── */

export async function createCategory(nameAr: string): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requireAdmin();
  const name = nameAr.trim() || "قسم جديد";
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while ((await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1)).length > 0) {
    slug = `${base}-${n++}`;
  }
  const all = await db.select({ id: categories.id }).from(categories);
  const [row] = await db
    .insert(categories)
    .values({ slug, nameAr: name, nameEn: name, sort: all.length + 1 })
    .returning({ id: categories.id });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateCategory(
  id: number,
  patch: {
    nameAr?: string;
    nameEn?: string;
    slug?: string;
    icon?: string | null;
    sort?: number;
    isActive?: boolean;
    viewStyle?: string;
    seasonalStartMonth?: number | null;
    seasonalEndMonth?: number | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (patch.slug !== undefined) {
    const slug = patch.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) return { ok: false, error: "المعرّف يجب أن يكون حروف إنجليزية صغيرة وأرقام" };
    const conflict = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
    if (conflict.length && conflict[0].id !== id) return { ok: false, error: "المعرّف مستخدم بالفعل لقسم آخر" };
    patch.slug = slug;
  }
  if (patch.icon !== undefined && patch.icon && !CATEGORY_ICON_KEYS.includes(patch.icon)) patch.icon = null;
  if (patch.viewStyle !== undefined && !["classic_list", "compact_list"].includes(patch.viewStyle)) {
    patch.viewStyle = "classic_list";
  }
  await db.update(categories).set(patch).where(eq(categories.id, id));
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const childItems = await db.select({ id: items.id }).from(items).where(eq(items.categoryId, id));
  const before = {
    kind: "deleted_items",
    categories: await db.select().from(categories).where(eq(categories.id, id)),
    items: childItems.length ? await db.select().from(items).where(eq(items.categoryId, id)) : [],
    variants: [] as unknown[],
    links: [] as unknown[],
  };
  await writeAudit({
    action: "category.delete",
    entityType: "category",
    entityId: String(id),
    summary: `حذف قسم (و${childItems.length} صنف داخله)`,
    before,
  });
  await db.delete(categories).where(eq(categories.id, id));
  refresh();
  return { ok: true };
}

export async function reorderCategories(orderedIds: number[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(categories).set({ sort: i + 1 }).where(eq(categories.id, orderedIds[i]));
  }
  refresh();
  return { ok: true };
}

/* ── Add-on groups & addons ── */

export async function createAddonGroup(nameAr: string): Promise<{ ok: boolean; id?: number }> {
  await requireAdmin();
  const name = nameAr.trim() || "مجموعة إضافات";
  const base = slugify(name);
  let code = base;
  let n = 2;
  while ((await db.select({ id: addonGroups.id }).from(addonGroups).where(eq(addonGroups.code, code)).limit(1)).length > 0) {
    code = `${base}-${n++}`;
  }
  const all = await db.select({ id: addonGroups.id }).from(addonGroups);
  const [row] = await db
    .insert(addonGroups)
    .values({ code, nameAr: name, nameEn: name, sort: all.length + 1 })
    .returning({ id: addonGroups.id });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateAddonGroup(
  id: number,
  patch: { nameAr?: string; nameEn?: string; minSelect?: number; maxSelect?: number; sort?: number; isActive?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (
    patch.maxSelect !== undefined &&
    patch.minSelect !== undefined &&
    patch.maxSelect > 0 &&
    patch.maxSelect < patch.minSelect
  ) {
    return { ok: false, error: "أقصى اختيار لا يمكن أن يكون أقل من أقل اختيار" };
  }
  await db.update(addonGroups).set(patch).where(eq(addonGroups.id, id));
  refresh();
  return { ok: true };
}

export async function deleteAddonGroup(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await writeAudit({
    action: "addon_group.delete",
    entityType: "addon_group",
    entityId: String(id),
    summary: "حذف مجموعة إضافات",
  });
  await db.delete(addonGroups).where(eq(addonGroups.id, id));
  refresh();
  return { ok: true };
}

export async function createAddon(
  groupId: number,
  data: { nameAr: string; nameEn?: string; priceDelta?: string },
): Promise<{ ok: boolean; id?: number }> {
  await requireAdmin();
  const count = await db.select({ id: addons.id }).from(addons).where(eq(addons.groupId, groupId));
  const name = data.nameAr.trim() || "إضافة";
  const [row] = await db
    .insert(addons)
    .values({
      groupId,
      nameAr: name,
      nameEn: data.nameEn?.trim() || name,
      priceDelta: data.priceDelta && !Number.isNaN(parseFloat(data.priceDelta)) ? parseFloat(data.priceDelta).toFixed(2) : "0",
      sort: count.length + 1,
    })
    .returning({ id: addons.id });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateAddon(
  id: number,
  patch: { nameAr?: string; nameEn?: string; priceDelta?: string; isActive?: boolean },
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const set: Record<string, unknown> = {};
  if (patch.nameAr !== undefined) set.nameAr = patch.nameAr;
  if (patch.nameEn !== undefined) set.nameEn = patch.nameEn;
  if (patch.priceDelta !== undefined)
    set.priceDelta = Number.isNaN(parseFloat(patch.priceDelta)) ? "0" : parseFloat(patch.priceDelta).toFixed(2);
  if (patch.isActive !== undefined) set.isActive = patch.isActive;
  await db.update(addons).set(set).where(eq(addons.id, id));
  refresh();
  return { ok: true };
}

export async function toggleAddonAvailability(id: number, available: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.update(addons).set({ isAvailable: available }).where(eq(addons.id, id));
  return { ok: true };
}

export async function deleteAddon(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(addons).where(eq(addons.id, id));
  refresh();
  return { ok: true };
}
