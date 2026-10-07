import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, addons, categories, itemAddonGroups, items, variants } from "@/db/schema";
import { getSettings } from "./settings";
import type { Settings } from "@/db/schema";

export type MenuVariant = {
  id: number;
  nameAr: string | null;
  nameEn: string | null;
  price: string | null;
  isAvailable: boolean;
};

export type MenuAddon = {
  id: number;
  nameAr: string;
  nameEn: string;
  priceDelta: string;
  isAvailable: boolean;
};

export type MenuAddonGroup = {
  id: number;
  nameAr: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  addons: MenuAddon[];
};

export type MenuItem = {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  badges: string[];
  prepNote: string | null;
  isAvailable: boolean;
  variants: MenuVariant[];
  addonGroups: MenuAddonGroup[];
};

export type MenuCategory = {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  viewStyle: string;
  items: MenuItem[];
};

export type MenuData = {
  settings: Omit<Settings, "adminPasswordHash">;
  categories: MenuCategory[];
  bestsellers: MenuItem[];
  announcementLive: boolean;
};

function monthActive(start: number | null, end: number | null, month: number): boolean {
  if (start === null || end === null) return true;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end; // wraps year (e.g. 11..2)
}

export const getMenuData = unstable_cache(
  async (): Promise<MenuData> => {
    try {
      return await loadMenuData();
    } catch (e) {
      // DB not reachable (e.g. prerender at build time) → branded empty state;
      // revalidate window + revalidateTag bring live data right after deploy.
      console.error("[menu] falling back to empty data:", e instanceof Error ? e.message : e);
      return FALLBACK_DATA();
    }
  },
  ["menu-v1"],
  { tags: ["menu"], revalidate: 60 },
);

function FALLBACK_DATA(): MenuData {
  return {
    settings: {
      id: 1,
      cafeNameAr: process.env.CAFE_NAME_AR || "كافيه السعد",
      cafeNameEn: process.env.CAFE_NAME_EN || "Elsa3d Cafe",
      phone: process.env.CAFE_PHONE || "+201025617078",
      whatsapp: process.env.CAFE_WHATSAPP || "201025617078",
      currencyLabel: "ج.م",
      primaryColor: "#1c1917",
      accentColor: "#b8860b",
      fontChoice: "cairo",
      defaultMode: "auto",
      announcement: null,
      announcementActive: false,
      announcementExpiresAt: null,
      oosDisplayMode: "hide",
      peakMode: false,
      footerNoteAr: null,
      footerNoteEn: null,
      workingHours: null,
      updatedAt: new Date(0),
    },
    categories: [],
    bestsellers: [],
    announcementLive: false,
  };
}

async function loadMenuData(): Promise<MenuData> {
  const s = await getSettings();
    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sort), asc(categories.id));

    const its = await db
      .select()
      .from(items)
      .where(eq(items.isActive, true))
      .orderBy(asc(items.sort), asc(items.id));

    const vs = await db
      .select()
      .from(variants)
      .where(eq(variants.isActive, true))
      .orderBy(asc(variants.sort), asc(variants.id));

    const links = await db.select().from(itemAddonGroups);
    const groups = await db
      .select()
      .from(addonGroups)
      .where(eq(addonGroups.isActive, true))
      .orderBy(asc(addonGroups.sort), asc(addonGroups.id));
    const adds = await db
      .select()
      .from(addons)
      .where(eq(addons.isActive, true))
      .orderBy(asc(addons.sort), asc(addons.id));

    const currentMonth = new Date().getMonth() + 1;

    const variantsByItem = new Map<number, MenuVariant[]>();
    for (const v of vs) {
      const list = variantsByItem.get(v.itemId) ?? [];
      list.push({ id: v.id, nameAr: v.nameAr, nameEn: v.nameEn, price: v.price, isAvailable: v.isAvailable });
      variantsByItem.set(v.itemId, list);
    }

    const addonsByGroup = new Map<number, MenuAddon[]>();
    for (const a of adds) {
      const list = addonsByGroup.get(a.groupId) ?? [];
      list.push({ id: a.id, nameAr: a.nameAr, nameEn: a.nameEn, priceDelta: a.priceDelta, isAvailable: a.isAvailable });
      addonsByGroup.set(a.groupId, list);
    }

    const groupsByItem = new Map<number, MenuAddonGroup[]>();
    for (const l of links) {
      const g = groups.find((x) => x.id === l.groupId);
      if (!g) continue;
      const list = groupsByItem.get(l.itemId) ?? [];
      list.push({
        id: g.id,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        addons: addonsByGroup.get(g.id) ?? [],
      });
      groupsByItem.set(l.itemId, list);
    }

    const menuCategories: MenuCategory[] = [];
    const bestsellers: MenuItem[] = [];

    for (const c of cats) {
      if (!monthActive(c.seasonalStartMonth, c.seasonalEndMonth, currentMonth)) continue;
      const catItems: MenuItem[] = [];
      for (const it of its) {
        if (it.categoryId !== c.id) continue;
        const mi: MenuItem = {
          id: it.id,
          code: it.code,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          descAr: it.descAr,
          descEn: it.descEn,
          badges: it.badges ?? [],
          prepNote: it.prepNote,
          isAvailable: it.isAvailable,
          variants: variantsByItem.get(it.id) ?? [],
          addonGroups: groupsByItem.get(it.id) ?? [],
        };
        catItems.push(mi);
        if (mi.badges.includes("bestseller")) bestsellers.push(mi);
      }
      menuCategories.push({
        id: c.id,
        slug: c.slug,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        icon: c.icon,
        viewStyle: c.viewStyle,
        items: catItems,
      });
    }

    const { adminPasswordHash: _omit, ...safeSettings } = s;
    void _omit;

    return {
      settings: safeSettings,
      categories: menuCategories,
      bestsellers,
      announcementLive:
        Boolean(s.announcementActive && s.announcement) &&
        (!s.announcementExpiresAt || s.announcementExpiresAt.getTime() > Date.now()),
    };
}

/** Ids of unavailable items + variants (for the lightweight availability endpoint). */
export async function getUnavailableIds(): Promise<{
  items: number[];
  variants: number[];
  peakMode: boolean;
  oosMode: string;
}> {
  const rowsV = await db
    .select({ id: variants.id })
    .from(variants)
    .where(or(eq(variants.isAvailable, false), eq(variants.isActive, false)));
  const rowsI = await db
    .select({ id: items.id })
    .from(items)
    .where(or(eq(items.isAvailable, false), eq(items.isActive, false)));
  const s = await getSettings();
  return {
    items: rowsI.map((r) => r.id),
    variants: rowsV.map((r) => r.id),
    peakMode: s.peakMode,
    oosMode: s.oosDisplayMode,
  };
}

export function hasAnyContent(data: MenuData): boolean {
  return data.categories.some((c) => c.items.length > 0);
}
