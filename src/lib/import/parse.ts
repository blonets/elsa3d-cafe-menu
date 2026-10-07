import ExcelJS from "exceljs";
import {
  type ImportError,
  type ParsedAddon,
  type ParsedAddonGroup,
  type ParsedCategory,
  type ParsedImport,
  type ParsedItem,
  type ParsedLink,
  type ParsedVariant,
  HEADER_ALIASES,
  SHEET_NAMES,
  mapHeaders,
  normalizeNum,
  parseBool,
  parseNumber,
  slugOk,
  validBadges,
  validIcons,
} from "./types";
import { BADGES } from "@/lib/badges";
import { CATEGORY_ICON_KEYS } from "@/lib/icons";

type Row = ExcelJS.Row;

function cell(row: Row, col: number | undefined): string {
  if (col === undefined) return "";
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("text" in v) return String(v.text).trim();
    if ("result" in v) return String(v.result ?? "").trim();
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
    return "";
  }
  return String(v).trim();
}

function findSheet(wb: ExcelJS.Workbook, canonical: string): ExcelJS.Worksheet | null {
  // Match by exact English name (case-insensitive) or common Arabic sheet aliases
  const sheetAliases: Record<string, string[]> = {
    Categories: ["categories", "الأقسام", "الاقسام"],
    Items: ["items", "الأصناف", "الاصناف", "المنيو"],
    Variants: ["variants", "الأحجام", "الاحجام", "الأسعار", "الاسعار"],
    AddonGroups: ["addongroups", "مجموعات الإضافات", "مجموعات الاضافات"],
    Addons: ["addons", "الإضافات", "الاضافات"],
    ItemAddonLinks: ["itemaddonlinks", "الربط", "روابط"],
  };
  const names = sheetAliases[canonical] ?? [canonical.toLowerCase()];
  return (
    wb.worksheets.find((ws) => names.includes(ws.name.trim().toLowerCase())) ?? null
  );
}

/** Parse an XLSX buffer into a normalized, validated import payload. */
export async function parseWorkbook(buffer: Buffer | ArrayBuffer): Promise<ParsedImport> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);

  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  const result: ParsedImport = {
    categories: [],
    items: [],
    variants: [],
    addonGroups: [],
    addons: [],
    links: [],
    errors,
    warnings,
  };

  /* ── Categories ── */
  const catSheet = findSheet(wb, "Categories");
  if (catSheet) {
    const seen = new Set<string>();
    const hCat = mapHeaders(catSheet.getRow(1).values as unknown[]);
    catSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hCat;
      if (h["slug"] === undefined) return; // empty row
      const slug = cell(row, h["slug"]).toLowerCase().replace(/\s+/g, "-");
      const nameAr = cell(row, h["name_ar"]);
      const nameEn = cell(row, h["name_en"]);
      const icon = cell(row, h["icon"]).toLowerCase() || null;
      const sort = parseNumber(cell(row, h["sort"])) ?? 0;
      const isActive = parseBool(cell(row, h["is_active"]), true);
      const viewStyleRaw = cell(row, h["view_style"]).toLowerCase();
      const viewStyle = viewStyleRaw === "compact_list" || viewStyleRaw === "compact" ? "compact_list" : "classic_list";
      const seasonStart = parseNumber(cell(row, h["seasonal_start_month"]));
      const seasonEnd = parseNumber(cell(row, h["seasonal_end_month"]));

      if (!slug) {
        errors.push({ sheet: "Categories", row: rowNumber, message: "المعرّف (slug) مطلوب" });
        return;
      }
      if (!slugOk(slug)) {
        errors.push({ sheet: "Categories", row: rowNumber, message: `المعرّف "${slug}" غير صالح — استخدم حروف إنجليزية صغيرة وأرقام فقط (مثال: hot-drinks)` });
        return;
      }
      if (!nameAr && !nameEn) {
        errors.push({ sheet: "Categories", row: rowNumber, message: `القسم "${slug}" يحتاج اسم بالعربي أو بالإنجليزي على الأقل` });
        return;
      }
      if (seen.has(slug)) {
        errors.push({ sheet: "Categories", row: rowNumber, message: `المعرّف "${slug}" مكرر في الملف` });
        return;
      }
      seen.add(slug);
      if (icon && !CATEGORY_ICON_KEYS.includes(icon)) {
        warnings.push({ sheet: "Categories", row: rowNumber, message: `أيقونة غير معروفة "${icon}" — سيتم تجاهلها. المتاح: ${validIcons()}` });
      }
      for (const [label, v] of [["بداية الموسم", seasonStart], ["نهاية الموسم", seasonEnd]] as const) {
        if (v !== null && (v < 1 || v > 12)) {
          errors.push({ sheet: "Categories", row: rowNumber, message: `${label} يجب أن يكون رقم شهر من 1 إلى 12` });
          return;
        }
      }
      result.categories.push({
        slug,
        nameAr: nameAr || nameEn,
        nameEn: nameEn || nameAr,
        icon: icon && CATEGORY_ICON_KEYS.includes(icon) ? icon : null,
        sort,
        isActive,
        viewStyle,
        seasonalStartMonth: seasonStart,
        seasonalEndMonth: seasonEnd,
      });
    });
  } else {
    errors.push({ sheet: "Categories", row: 0, message: "شيت Categories غير موجود في الملف" });
  }

  const catSlugs = new Set(result.categories.map((c) => c.slug));

  /* ── Items ── */
  const itemSheet = findSheet(wb, "Items");
  if (itemSheet) {
    const seen = new Set<string>();
    const hItem = mapHeaders(itemSheet.getRow(1).values as unknown[]);
    itemSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hItem;
      if (h["code"] === undefined) return;
      const code = cell(row, h["code"]).toLowerCase().replace(/\s+/g, "-");
      const categorySlug = cell(row, h["category_slug"]).toLowerCase().replace(/\s+/g, "-");
      const nameAr = cell(row, h["name_ar"]);
      const nameEn = cell(row, h["name_en"]);
      const descAr = cell(row, h["desc_ar"]) || null;
      const descEn = cell(row, h["desc_en"]) || null;
      const badgesRaw = cell(row, h["badges"]);
      const prepNote = cell(row, h["prep_note"]) || null;
      const sort = parseNumber(cell(row, h["sort"])) ?? 0;
      const isActive = parseBool(cell(row, h["is_active"]), true);

      if (!code) {
        errors.push({ sheet: "Items", row: rowNumber, message: "كود الصنف (code) مطلوب" });
        return;
      }
      if (!slugOk(code)) {
        errors.push({ sheet: "Items", row: rowNumber, message: `كود الصنف "${code}" غير صالح — حروف إنجليزية صغيرة وأرقام وشرطات فقط` });
        return;
      }
      if (!categorySlug) {
        errors.push({ sheet: "Items", row: rowNumber, message: `الصنف "${code}" بدون قسم (category_slug مطلوب)` });
        return;
      }
      if (!nameAr && !nameEn) {
        errors.push({ sheet: "Items", row: rowNumber, message: `الصنف "${code}" يحتاج اسم بالعربي أو بالإنجليزي على الأقل` });
        return;
      }
      if (seen.has(code)) {
        errors.push({ sheet: "Items", row: rowNumber, message: `كود الصنف "${code}" مكرر في الملف` });
        return;
      }
      seen.add(code);
      if (!catSlugs.has(categorySlug)) {
        errors.push({ sheet: "Items", row: rowNumber, message: `الصنف "${code}" يشير لقسم غير موجود في الملف: "${categorySlug}"` });
        return;
      }
      const badges: string[] = [];
      if (badgesRaw) {
        for (const b of badgesRaw.split(/[|,/]/).map((x) => x.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean)) {
          if (!(BADGES as readonly string[]).includes(b)) {
            errors.push({ sheet: "Items", row: rowNumber, message: `شارة غير معروفة "${b}" للصنف "${code}". المتاح: ${validBadges()}` });
            return;
          }
          badges.push(b);
        }
      }
      result.items.push({ code, categorySlug, nameAr: nameAr || nameEn, nameEn: nameEn || nameAr, descAr, descEn, badges, prepNote, sort, isActive });
    });
  } else {
    errors.push({ sheet: "Items", row: 0, message: "شيت Items غير موجود في الملف" });
  }

  const itemCodes = new Set(result.items.map((i) => i.code));

  /* ── Variants ── */
  const varSheet = findSheet(wb, "Variants");
  if (varSheet) {
    const hVar = mapHeaders(varSheet.getRow(1).values as unknown[]);
    varSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hVar;
      if (h["item_code"] === undefined && h["price"] === undefined) return;
      const itemCode = cell(row, h["item_code"]).toLowerCase().replace(/\s+/g, "-");
      const nameAr = cell(row, h["name_ar"]) || null;
      const nameEn = cell(row, h["name_en"]) || null;
      const priceRaw = normalizeNum(cell(row, h["price"]));
      const sort = parseNumber(cell(row, h["sort"])) ?? 0;
      const isActive = parseBool(cell(row, h["is_active"]), true);
      const isAvailable = parseBool(cell(row, h["is_available"]), true);
      const price = priceRaw === "" ? null : parseNumber(priceRaw);

      if (!itemCode) {
        errors.push({ sheet: "Variants", row: rowNumber, message: "كود الصنف (item_code) مطلوب في شيت الأسعار" });
        return;
      }
      if (!itemCodes.has(itemCode)) {
        errors.push({ sheet: "Variants", row: rowNumber, message: `صف سعر يشير لصنف غير موجود: "${itemCode}"` });
        return;
      }
      if (priceRaw !== "" && (price === null || price < 0)) {
        errors.push({ sheet: "Variants", row: rowNumber, message: `سعر غير صالح "${cell(row, h["price"])}" للصنف "${itemCode}"` });
        return;
      }
      if (!nameAr && !nameEn && price === null) {
        warnings.push({ sheet: "Variants", row: rowNumber, message: `صف سعر بدون اسم وبدون سعر للصنف "${itemCode}" — سيتم تجاهله` });
        return;
      }
      result.variants.push({ itemCode, nameAr, nameEn, price: price === null ? null : price.toFixed(2), sort, isActive, isAvailable });
    });
  } else {
    warnings.push({ sheet: "Variants", row: 0, message: "شيت Variants غير موجود — الأصناف ستدخل بدون أسعار" });
  }

  /* ── AddonGroups ── */
  const grpSheet = findSheet(wb, "AddonGroups");
  if (grpSheet) {
    const seen = new Set<string>();
    const hGrp = mapHeaders(grpSheet.getRow(1).values as unknown[]);
    grpSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hGrp;
      if (h["code"] === undefined) return;
      const code = cell(row, h["code"]).toLowerCase().replace(/\s+/g, "-");
      const nameAr = cell(row, h["name_ar"]);
      const nameEn = cell(row, h["name_en"]);
      const minSelect = parseNumber(cell(row, h["min_select"])) ?? 0;
      const maxSelect = parseNumber(cell(row, h["max_select"])) ?? 0;
      const sort = parseNumber(cell(row, h["sort"])) ?? 0;
      const isActive = parseBool(cell(row, h["is_active"]), true);

      if (!code) {
        errors.push({ sheet: "AddonGroups", row: rowNumber, message: "كود مجموعة الإضافات (code) مطلوب" });
        return;
      }
      if (!slugOk(code)) {
        errors.push({ sheet: "AddonGroups", row: rowNumber, message: `كود المجموعة "${code}" غير صالح` });
        return;
      }
      if (!nameAr && !nameEn) {
        errors.push({ sheet: "AddonGroups", row: rowNumber, message: `المجموعة "${code}" تحتاج اسم على الأقل بلغة واحدة` });
        return;
      }
      if (seen.has(code)) {
        errors.push({ sheet: "AddonGroups", row: rowNumber, message: `كود المجموعة "${code}" مكرر` });
        return;
      }
      seen.add(code);
      if (maxSelect > 0 && maxSelect < minSelect) {
        errors.push({ sheet: "AddonGroups", row: rowNumber, message: `المجموعة "${code}": أقصى اختيار (${maxSelect}) أقل من أقل اختيار (${minSelect})` });
        return;
      }
      result.addonGroups.push({ code, nameAr: nameAr || nameEn, nameEn: nameEn || nameAr, minSelect, maxSelect, sort, isActive });
    });
  }

  /* ── Addons ── */
  const addSheet = findSheet(wb, "Addons");
  if (addSheet) {
    const groupCodes = new Set(result.addonGroups.map((g) => g.code));
    const hAdd = mapHeaders(addSheet.getRow(1).values as unknown[]);
    addSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hAdd;
      if (h["group_code"] === undefined) return;
      const groupCode = cell(row, h["group_code"]).toLowerCase().replace(/\s+/g, "-");
      const nameAr = cell(row, h["name_ar"]);
      const nameEn = cell(row, h["name_en"]);
      const delta = parseNumber(cell(row, h["price_delta"])) ?? 0;
      const sort = parseNumber(cell(row, h["sort"])) ?? 0;
      const isActive = parseBool(cell(row, h["is_active"]), true);
      const isAvailable = parseBool(cell(row, h["is_available"]), true);

      if (!groupCode) {
        errors.push({ sheet: "Addons", row: rowNumber, message: "كود المجموعة (group_code) مطلوب في شيت الإضافات" });
        return;
      }
      if (!groupCodes.has(groupCode)) {
        errors.push({ sheet: "Addons", row: rowNumber, message: `إضافة تشير لمجموعة غير موجودة: "${groupCode}"` });
        return;
      }
      if (!nameAr && !nameEn) {
        errors.push({ sheet: "Addons", row: rowNumber, message: `إضافة في المجموعة "${groupCode}" تحتاج اسم على الأقل بلغة واحدة` });
        return;
      }
      result.addons.push({ groupCode, nameAr: nameAr || nameEn, nameEn: nameEn || nameAr, priceDelta: delta.toFixed(2), sort, isActive, isAvailable });
    });
  }

  /* ── ItemAddonLinks ── */
  const linkSheet = findSheet(wb, "ItemAddonLinks");
  if (linkSheet) {
    const groupCodes = new Set(result.addonGroups.map((g) => g.code));
    const seenPairs = new Set<string>();
    const hLink = mapHeaders(linkSheet.getRow(1).values as unknown[]);
    linkSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const h = hLink;
      if (h["item_code"] === undefined) return;
      const itemCode = cell(row, h["item_code"]).toLowerCase().replace(/\s+/g, "-");
      const groupCode = cell(row, h["group_code"]).toLowerCase().replace(/\s+/g, "-");
      if (!itemCode && !groupCode) return;
      if (!itemCodes.has(itemCode)) {
        errors.push({ sheet: "ItemAddonLinks", row: rowNumber, message: `ربط يشير لصنف غير موجود: "${itemCode}"` });
        return;
      }
      if (!groupCodes.has(groupCode)) {
        errors.push({ sheet: "ItemAddonLinks", row: rowNumber, message: `ربط يشير لمجموعة إضافات غير موجودة: "${groupCode}"` });
        return;
      }
      const pair = `${itemCode}|${groupCode}`;
      if (seenPairs.has(pair)) return;
      seenPairs.add(pair);
      result.links.push({ itemCode, groupCode });
    });
  }

  return result;
}
