import { BADGES } from "@/lib/badges";
import { CATEGORY_ICON_KEYS } from "@/lib/icons";

export type ImportError = { sheet: string; row: number; message: string };

export type ParsedCategory = {
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  sort: number;
  isActive: boolean;
  viewStyle: string;
  seasonalStartMonth: number | null;
  seasonalEndMonth: number | null;
};

export type ParsedItem = {
  code: string;
  categorySlug: string;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  badges: string[];
  prepNote: string | null;
  sort: number;
  isActive: boolean;
};

export type ParsedVariant = {
  itemCode: string;
  nameAr: string | null;
  nameEn: string | null;
  price: string | null;
  sort: number;
  isActive: boolean;
  isAvailable: boolean;
};

export type ParsedAddonGroup = {
  code: string;
  nameAr: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  sort: number;
  isActive: boolean;
};

export type ParsedAddon = {
  groupCode: string;
  nameAr: string;
  nameEn: string;
  priceDelta: string;
  sort: number;
  isActive: boolean;
  isAvailable: boolean;
};

export type ParsedLink = { itemCode: string; groupCode: string };

export type ParsedImport = {
  categories: ParsedCategory[];
  items: ParsedItem[];
  variants: ParsedVariant[];
  addonGroups: ParsedAddonGroup[];
  addons: ParsedAddon[];
  links: ParsedLink[];
  errors: ImportError[];
  warnings: ImportError[];
};

export const SHEET_NAMES = ["Categories", "Items", "Variants", "AddonGroups", "Addons", "ItemAddonLinks"] as const;
export type SheetName = (typeof SHEET_NAMES)[number];

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeNum(raw: unknown): string {
  let s = String(raw ?? "").trim();
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  s = s.replace(/[٫,]/g, ".");
  s = s.replace(/[^\d.-]/g, "");
  return s;
}

export function parseNumber(raw: unknown): number | null {
  const s = normalizeNum(raw);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseBool(raw: unknown, def: boolean): boolean {
  if (raw === null || raw === undefined || String(raw).trim() === "") return def;
  const s = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "نعم", "مفعل", "متاح", "متوفر"].includes(s)) return true;
  if (["false", "0", "no", "لا", "معطل", "غير متوفر"].includes(s)) return false;
  return def;
}

export function slugOk(s: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/.test(s);
}

/** Header aliases: canonical → accepted variants (English + Arabic). */
export const HEADER_ALIASES: Record<string, string[]> = {
  slug: ["slug", "المعرف", "الكود", "معرف القسم"],
  code: ["code", "الكود", "كود"],
  "category_slug": ["category_slug", "القسم", "كود القسم", "slug القسم"],
  "item_code": ["item_code", "كود الصنف", "الصنف"],
  "group_code": ["group_code", "كود المجموعة", "المجموعة"],
  "name_ar": ["name_ar", "الاسم بالعربي", "الاسم (عربي)", "عربي"],
  "name_en": ["name_en", "الاسم بالانجليزي", "الاسم (انجليزي)", "انجليزي"],
  "desc_ar": ["desc_ar", "الوصف بالعربي", "الوصف (عربي)"],
  "desc_en": ["desc_en", "الوصف بالانجليزي", "الوصف (انجليزي)"],
  icon: ["icon", "الأيقونة", "الايقونة"],
  sort: ["sort", "الترتيب"],
  "is_active": ["is_active", "مفعل", "نشط"],
  "is_available": ["is_available", "متوفر", "متاح"],
  "view_style": ["view_style", "نمط العرض"],
  "seasonal_start_month": ["seasonal_start_month", "بداية الموسم"],
  "seasonal_end_month": ["seasonal_end_month", "نهاية الموسم"],
  badges: ["badges", "الشارات", "شارات"],
  "prep_note": ["prep_note", "وقت التحضير", "ملاحظة التحضير"],
  price: ["price", "السعر"],
  "price_delta": ["price_delta", "فرق السعر", "السعر الإضافي"],
  "min_select": ["min_select", "أقل اختيار"],
  "max_select": ["max_select", "أقصى اختيار", "اكثر اختيار"],
};

export function mapHeaders(rawHeaders: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const s = String(h ?? "").trim().toLowerCase();
    if (!s) return;
    for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(s)) {
        if (map[canonical] === undefined) map[canonical] = i;
        return;
      }
    }
  });
  return map;
}

export function validBadges(): string {
  return BADGES.join(" | ");
}

export function validIcons(): string {
  return CATEGORY_ICON_KEYS.join(" | ");
}
