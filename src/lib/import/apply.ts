import "server-only";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import {
  addonGroups,
  addons,
  audits,
  categories,
  itemAddonGroups,
  items,
  variants,
} from "@/db/schema";
import type { ParsedImport } from "./types";
import { snapshotCatalog, writeAudit, restoreCatalogTx, getAuditById, markAuditUndone, reviveDates } from "@/lib/audit";
import type { CatalogSnapshot } from "@/lib/audit";

export type ImportMode = "merge" | "replace";

export type ImportSummary = {
  mode: ImportMode;
  categories: { created: number; updated: number };
  items: { created: number; updated: number };
  variants: { created: number; updated: number };
  addonGroups: { created: number; updated: number };
  addons: { created: number; updated: number };
  links: { created: number; unchanged: number };
};

export type ImportPreviewRow = { sheet: string; label: string; detail: string };

export type ImportPreview = {
  ok: boolean;
  mode: ImportMode;
  summary: ImportSummary;
  errors: { sheet: string; row: number; message: string }[];
  warnings: { sheet: string; row: number; message: string }[];
  skipped: number;
  samples: ImportPreviewRow[];
};

function emptySummary(mode: ImportMode): ImportSummary {
  return {
    mode,
    categories: { created: 0, updated: 0 },
    items: { created: 0, updated: 0 },
    variants: { created: 0, updated: 0 },
    addonGroups: { created: 0, updated: 0 },
    addons: { created: 0, updated: 0 },
    links: { created: 0, unchanged: 0 },
  };
}

function label(nameAr: string, nameEn: string): string {
  return nameAr === nameEn ? nameAr : `${nameAr} / ${nameEn}`;
}

function matchesVariant(
  ev: { itemId: number; nameAr: string | null; nameEn: string | null },
  itemId: number,
  v: { nameAr: string | null; nameEn: string | null },
): boolean {
  if (ev.itemId !== itemId) return false;
  if (v.nameAr && ev.nameAr === v.nameAr) return true;
  if (v.nameEn && ev.nameEn === v.nameEn) return true;
  if (!v.nameAr && !v.nameEn && !ev.nameAr && !ev.nameEn) return true;
  return false;
}

function matchesAddon(
  ea: { groupId: number; nameAr: string; nameEn: string },
  groupId: number,
  a: { nameAr: string; nameEn: string },
): boolean {
  return ea.groupId === groupId && (ea.nameAr === a.nameAr || ea.nameEn === a.nameEn);
}

/**
 * Build a full dry-run preview: what would be created/updated, all errors,
 * warnings and a small sample of rows. Never writes anything.
 */
export async function buildPreview(
  parsed: ParsedImport,
  mode: ImportMode,
  ignoreInvalidRows: boolean,
): Promise<ImportPreview> {
  const summary = emptySummary(mode);
  const errors = [...parsed.errors];
  const warnings = [...parsed.warnings];

  if (errors.length > 0 && !ignoreInvalidRows) {
    return { ok: false, mode, summary, errors, warnings, skipped: 0, samples: sampleRows(parsed) };
  }

  const existingCats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const existingItems = await db.select({ id: items.id, code: items.code }).from(items);
  const existingGroups = await db.select({ id: addonGroups.id, code: addonGroups.code }).from(addonGroups);
  const itemMap = new Map(existingItems.map((e) => [e.code, e.id]));
  const groupMap = new Map(existingGroups.map((e) => [e.code, e.id]));

  for (const c of parsed.categories) {
    if (existingCats.some((e) => e.slug === c.slug)) summary.categories.updated++;
    else summary.categories.created++;
  }
  for (const it of parsed.items) {
    if (existingItems.some((e) => e.code === it.code)) summary.items.updated++;
    else summary.items.created++;
  }

  if (mode === "replace") {
    summary.variants.created = parsed.variants.length;
    summary.addonGroups.created = parsed.addonGroups.length;
    summary.addons.created = parsed.addons.length;
    summary.links.created = parsed.links.length;
  } else {
    const existingVariants = await db
      .select({ id: variants.id, itemId: variants.itemId, nameAr: variants.nameAr, nameEn: variants.nameEn })
      .from(variants);
    for (const v of parsed.variants) {
      const itemId = itemMap.get(v.itemCode);
      if (itemId !== undefined && existingVariants.some((ev) => matchesVariant(ev, itemId, v))) summary.variants.updated++;
      else summary.variants.created++;
    }
    for (const g of parsed.addonGroups) {
      if (existingGroups.some((e) => e.code === g.code)) summary.addonGroups.updated++;
      else summary.addonGroups.created++;
    }
    const existingAddons = await db
      .select({ id: addons.id, groupId: addons.groupId, nameAr: addons.nameAr, nameEn: addons.nameEn })
      .from(addons);
    for (const a of parsed.addons) {
      const groupId = groupMap.get(a.groupCode);
      if (groupId !== undefined && existingAddons.some((ea) => matchesAddon(ea, groupId, a))) summary.addons.updated++;
      else summary.addons.created++;
    }
    const existingLinks = await db.select().from(itemAddonGroups);
    for (const l of parsed.links) {
      const itemId = itemMap.get(l.itemCode);
      const groupId = groupMap.get(l.groupCode);
      if (itemId !== undefined && groupId !== undefined && existingLinks.some((el) => el.itemId === itemId && el.groupId === groupId)) {
        summary.links.unchanged++;
      } else {
        summary.links.created++;
      }
    }
  }

  const badRows = new Set(errors.filter((e) => e.row > 0).map((e) => `${e.sheet}:${e.row}`));

  return {
    ok: true,
    mode,
    summary,
    errors,
    warnings,
    skipped: badRows.size,
    samples: sampleRows(parsed),
  };
}

function sampleRows(parsed: ParsedImport): ImportPreviewRow[] {
  const rows: ImportPreviewRow[] = [];
  for (const c of parsed.categories.slice(0, 4)) {
    rows.push({ sheet: "Categories", label: label(c.nameAr, c.nameEn), detail: `${c.slug} · ترتيب ${c.sort}` });
  }
  for (const it of parsed.items.slice(0, 6)) {
    rows.push({ sheet: "Items", label: label(it.nameAr, it.nameEn), detail: `${it.code} · قسم ${it.categorySlug}` });
  }
  for (const v of parsed.variants.slice(0, 6)) {
    rows.push({ sheet: "Variants", label: v.nameAr ?? v.nameEn ?? "بدون اسم", detail: `${v.itemCode} · ${v.price ?? "بدون سعر"}` });
  }
  for (const g of parsed.addonGroups.slice(0, 3)) {
    rows.push({ sheet: "AddonGroups", label: label(g.nameAr, g.nameEn), detail: g.code });
  }
  for (const a of parsed.addons.slice(0, 4)) {
    rows.push({ sheet: "Addons", label: label(a.nameAr, a.nameEn), detail: `${a.groupCode} · +${a.priceDelta}` });
  }
  for (const l of parsed.links.slice(0, 4)) {
    rows.push({ sheet: "ItemAddonLinks", label: l.itemCode, detail: l.groupCode });
  }
  return rows.slice(0, 10);
}

/* ══════════════════════════ Execution ══════════════════════════ */

export type ImportResult = { auditId: number; summary: ImportSummary };

/** Execute a merge import inside one transaction with a before-snapshot for undo. */
export async function executeMerge(parsed: ParsedImport): Promise<ImportResult> {
  if (parsed.errors.length > 0) throw new Error("IMPORT_VALIDATION_ERRORS");

  const snapshot = await snapshotCatalog();
  const summary = emptySummary("merge");

  const auditId = await db.transaction(async (tx) => {
    /* Categories: upsert by slug */
    const catMap = new Map<string, number>();
    const existingCats = await tx.select({ id: categories.id, slug: categories.slug }).from(categories);
    for (const e of existingCats) catMap.set(e.slug, e.id);
    for (const c of parsed.categories) {
      const existingId = catMap.get(c.slug);
      if (existingId !== undefined) {
        await tx
          .update(categories)
          .set({
            nameAr: c.nameAr,
            nameEn: c.nameEn,
            icon: c.icon,
            sort: c.sort,
            isActive: c.isActive,
            viewStyle: c.viewStyle,
            seasonalStartMonth: c.seasonalStartMonth,
            seasonalEndMonth: c.seasonalEndMonth,
          })
          .where(eq(categories.id, existingId));
        summary.categories.updated++;
      } else {
        const [ins] = await tx.insert(categories).values(c).returning({ id: categories.id });
        catMap.set(c.slug, ins.id);
        summary.categories.created++;
      }
    }

    /* Items: upsert by code */
    const itemMap = new Map<string, number>();
    const existingItems = await tx.select({ id: items.id, code: items.code }).from(items);
    for (const e of existingItems) itemMap.set(e.code, e.id);
    for (const it of parsed.items) {
      const categoryId = catMap.get(it.categorySlug);
      if (categoryId === undefined) throw new Error(`INTERNAL: missing category ${it.categorySlug}`);
      const values = {
        code: it.code,
        categoryId,
        nameAr: it.nameAr,
        nameEn: it.nameEn,
        descAr: it.descAr,
        descEn: it.descEn,
        badges: it.badges,
        prepNote: it.prepNote,
        sort: it.sort,
        isActive: it.isActive,
      };
      const existingId = itemMap.get(it.code);
      if (existingId !== undefined) {
        await tx.update(items).set(values).where(eq(items.id, existingId));
        summary.items.updated++;
      } else {
        const [ins] = await tx.insert(items).values(values).returning({ id: items.id });
        itemMap.set(it.code, ins.id);
        summary.items.created++;
      }
    }

    /* Variants: match by (item, name) → update price/sort/flags, else insert */
    const existingVariants = await tx
      .select({ id: variants.id, itemId: variants.itemId, nameAr: variants.nameAr, nameEn: variants.nameEn })
      .from(variants);
    for (const v of parsed.variants) {
      const itemId = itemMap.get(v.itemCode);
      if (itemId === undefined) throw new Error(`INTERNAL: missing item ${v.itemCode}`);
      const existing = existingVariants.find((ev) => matchesVariant(ev, itemId, v));
      const values = {
        itemId,
        nameAr: v.nameAr,
        nameEn: v.nameEn,
        price: v.price,
        sort: v.sort,
        isActive: v.isActive,
        isAvailable: v.isAvailable,
      };
      if (existing) {
        await tx.update(variants).set(values).where(eq(variants.id, existing.id));
        summary.variants.updated++;
      } else {
        const [ins] = await tx.insert(variants).values(values).returning({ id: variants.id });
        existingVariants.push({ id: ins.id, itemId, nameAr: v.nameAr, nameEn: v.nameEn });
        summary.variants.created++;
      }
    }

    /* AddonGroups: upsert by code */
    const groupMap = new Map<string, number>();
    const existingGroups = await tx.select({ id: addonGroups.id, code: addonGroups.code }).from(addonGroups);
    for (const e of existingGroups) groupMap.set(e.code, e.id);
    for (const g of parsed.addonGroups) {
      const existingId = groupMap.get(g.code);
      if (existingId !== undefined) {
        await tx
          .update(addonGroups)
          .set({ nameAr: g.nameAr, nameEn: g.nameEn, minSelect: g.minSelect, maxSelect: g.maxSelect, sort: g.sort, isActive: g.isActive })
          .where(eq(addonGroups.id, existingId));
        summary.addonGroups.updated++;
      } else {
        const [ins] = await tx.insert(addonGroups).values(g).returning({ id: addonGroups.id });
        groupMap.set(g.code, ins.id);
        summary.addonGroups.created++;
      }
    }

    /* Addons: match by (group, name) → update delta/sort/flags, else insert */
    const existingAddons = await tx
      .select({ id: addons.id, groupId: addons.groupId, nameAr: addons.nameAr, nameEn: addons.nameEn })
      .from(addons);
    for (const a of parsed.addons) {
      const groupId = groupMap.get(a.groupCode);
      if (groupId === undefined) throw new Error(`INTERNAL: missing addon group ${a.groupCode}`);
      const existing = existingAddons.find((ea) => matchesAddon(ea, groupId, a));
      const values = {
        groupId,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        priceDelta: a.priceDelta,
        sort: a.sort,
        isActive: a.isActive,
        isAvailable: a.isAvailable,
      };
      if (existing) {
        await tx.update(addons).set(values).where(eq(addons.id, existing.id));
        summary.addons.updated++;
      } else {
        const [ins] = await tx.insert(addons).values(values).returning({ id: addons.id });
        existingAddons.push({ id: ins.id, groupId, nameAr: a.nameAr, nameEn: a.nameEn });
        summary.addons.created++;
      }
    }

    /* Links: insert missing pairs */
    const existingLinks = await tx.select().from(itemAddonGroups);
    for (const l of parsed.links) {
      const itemId = itemMap.get(l.itemCode);
      const groupId = groupMap.get(l.groupCode);
      if (itemId === undefined || groupId === undefined) throw new Error(`INTERNAL: missing link targets ${l.itemCode}/${l.groupCode}`);
      if (existingLinks.some((el) => el.itemId === itemId && el.groupId === groupId)) {
        summary.links.unchanged++;
      } else {
        await tx.insert(itemAddonGroups).values({ itemId, groupId });
        existingLinks.push({ itemId, groupId });
        summary.links.created++;
      }
    }

    const auditId = await writeAuditTx(tx, {
      action: "import.merge",
      summaryText: `استيراد دمج: ${summary.categories.created + summary.categories.updated} أقسام، ${summary.items.created + summary.items.updated} أصناف`,
      before: snapshot,
      after: summary,
    });
    return auditId;
  });

  revalidateTag("menu");
  return { auditId, summary };
}

/** Execute a replace-all import: wipes catalog tables then imports fresh. */
export async function executeReplace(parsed: ParsedImport): Promise<ImportResult> {
  if (parsed.errors.length > 0) throw new Error("IMPORT_VALIDATION_ERRORS");

  const snapshot = await snapshotCatalog();
  const summary = emptySummary("replace");

  const auditId = await db.transaction(async (tx) => {
    await tx.delete(itemAddonGroups);
    await tx.delete(addons);
    await tx.delete(addonGroups);
    await tx.delete(variants);
    await tx.delete(items);
    await tx.delete(categories);

    const catMap = new Map<string, number>();
    for (const c of parsed.categories) {
      const [ins] = await tx.insert(categories).values(c).returning({ id: categories.id });
      catMap.set(c.slug, ins.id);
      summary.categories.created++;
    }
    const itemMap = new Map<string, number>();
    for (const it of parsed.items) {
      const categoryId = catMap.get(it.categorySlug);
      if (categoryId === undefined) throw new Error(`INTERNAL: missing category ${it.categorySlug}`);
      const [ins] = await tx
        .insert(items)
        .values({
          code: it.code,
          categoryId,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          descAr: it.descAr,
          descEn: it.descEn,
          badges: it.badges,
          prepNote: it.prepNote,
          sort: it.sort,
          isActive: it.isActive,
        })
        .returning({ id: items.id });
      itemMap.set(it.code, ins.id);
      summary.items.created++;
    }
    for (const v of parsed.variants) {
      const itemId = itemMap.get(v.itemCode);
      if (itemId === undefined) throw new Error(`INTERNAL: missing item ${v.itemCode}`);
      await tx.insert(variants).values({
        itemId,
        nameAr: v.nameAr,
        nameEn: v.nameEn,
        price: v.price,
        sort: v.sort,
        isActive: v.isActive,
        isAvailable: v.isAvailable,
      });
      summary.variants.created++;
    }
    const groupMap = new Map<string, number>();
    for (const g of parsed.addonGroups) {
      const [ins] = await tx.insert(addonGroups).values(g).returning({ id: addonGroups.id });
      groupMap.set(g.code, ins.id);
      summary.addonGroups.created++;
    }
    for (const a of parsed.addons) {
      const groupId = groupMap.get(a.groupCode);
      if (groupId === undefined) throw new Error(`INTERNAL: missing addon group ${a.groupCode}`);
      await tx.insert(addons).values({
        groupId,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        priceDelta: a.priceDelta,
        sort: a.sort,
        isActive: a.isActive,
        isAvailable: a.isAvailable,
      });
      summary.addons.created++;
    }
    for (const l of parsed.links) {
      const itemId = itemMap.get(l.itemCode);
      const groupId = groupMap.get(l.groupCode);
      if (itemId === undefined || groupId === undefined) throw new Error(`INTERNAL: missing link targets ${l.itemCode}/${l.groupCode}`);
      await tx.insert(itemAddonGroups).values({ itemId, groupId });
      summary.links.created++;
    }

    // Reset sequences
    for (const table of ["categories", "items", "variants", "addon_groups", "addons"]) {
      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
        ),
      );
    }

    const auditId = await writeAuditTx(tx, {
      action: "import.replace",
      summaryText: `استبدال كامل: ${summary.categories.created} أقسام، ${summary.items.created} أصناف`,
      before: snapshot,
      after: summary,
    });
    return auditId;
  });

  revalidateTag("menu");
  return { auditId, summary };
}

/** Undo an import or bulk operation by restoring its before-snapshot. */
export async function undoAuditOperation(auditId: number): Promise<{ ok: boolean; message: string }> {
  const audit = await getAuditById(auditId);
  if (!audit) return { ok: false, message: "العملية غير موجودة" };
  if (audit.undoneAt) return { ok: false, message: "تم التراجع عن هذه العملية بالفعل" };
  if (!audit.before) return { ok: false, message: "لا توجد نسخة سابقة قابلة للاستعادة لهذه العملية" };

  const before = audit.before as Record<string, unknown>;

  if (Array.isArray(before.categories)) {
    // Full catalog snapshot (imports)
    const snapshot = before as unknown as CatalogSnapshot;
    await db.transaction(async (tx) => {
      await restoreCatalogTx(tx, snapshot);
      await tx.update(audits).set({ undoneAt: new Date() }).where(eq(audits.id, auditId));
    });
  } else if (before.kind === "variant_prices") {
    // Bulk pricing operation — restore individual variant prices
    const rows = before.rows as { id: number; price: string | null }[];
    await db.transaction(async (tx) => {
      for (const r of rows) {
        await tx.update(variants).set({ price: r.price }).where(eq(variants.id, r.id));
      }
      await tx.update(audits).set({ undoneAt: new Date() }).where(eq(audits.id, auditId));
    });
  } else if (before.kind === "deleted_items") {
    // Deleted items (single or bulk) — reinsert with original ids
    const snap = before as unknown as {
      categories: Record<string, unknown>[];
      items: Record<string, unknown>[];
      variants: Record<string, unknown>[];
      links: { itemId: number; groupId: number }[];
    };
    await db.transaction(async (tx) => {
      for (const c of snap.categories ?? []) await tx.insert(categories).values(reviveDates(c) as never).onConflictDoNothing();
      for (const i of snap.items ?? []) await tx.insert(items).values(reviveDates(i) as never);
      for (const v of snap.variants ?? []) await tx.insert(variants).values(reviveDates(v) as never);
      for (const l of snap.links ?? []) await tx.insert(itemAddonGroups).values(l).onConflictDoNothing();
      for (const table of ["categories", "items", "variants"]) {
        await tx.execute(
          sql.raw(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
          ),
        );
      }
      await tx.update(audits).set({ undoneAt: new Date() }).where(eq(audits.id, auditId));
    });
  } else {
    return { ok: false, message: "نوع العملية لا يدعم التراجع" };
  }

  revalidateTag("menu");
  return { ok: true, message: "تم التراجع بنجاح" };
}

async function writeAuditTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  entry: { action: string; summaryText: string; before: unknown; after: unknown },
): Promise<number> {
  const [row] = await tx
    .insert(audits)
    .values({
      actor: "admin",
      action: entry.action,
      entityType: "catalog",
      summary: entry.summaryText,
      before: entry.before ?? null,
      after: entry.after ?? null,
    })
    .returning({ id: audits.id });
  return row.id;
}

