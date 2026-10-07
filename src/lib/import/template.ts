import ExcelJS from "exceljs";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, addons, categories, itemAddonGroups, items, variants } from "@/db/schema";
import type { Worksheet } from "exceljs";

/* ══════════════════ Sheet definitions (single source of truth) ══════════════════ */

export const CATEGORY_HEADERS = ["slug", "name_ar", "name_en", "icon", "sort", "is_active", "view_style", "seasonal_start_month", "seasonal_end_month"];
export const ITEM_HEADERS = ["code", "category_slug", "name_ar", "name_en", "desc_ar", "desc_en", "badges", "prep_note", "sort", "is_active"];
export const VARIANT_HEADERS = ["item_code", "name_ar", "name_en", "price", "sort", "is_active", "is_available"];
export const GROUP_HEADERS = ["code", "name_ar", "name_en", "min_select", "max_select", "sort", "is_active"];
export const ADDON_HEADERS = ["group_code", "name_ar", "name_en", "price_delta", "sort", "is_active", "is_available"];
export const LINK_HEADERS = ["item_code", "group_code"];

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C1917" } };

function styleHeader(ws: Worksheet): void {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.fill = HEADER_FILL;
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.height = 22;
  ws.columns.forEach((c) => {
    c.width = Math.max(14, String(c.header ?? "").length + 4);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number | null)[][]): Worksheet {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  styleHeader(ws);
  return ws;
}

/* ══════════════════ README sheet (Arabic) ══════════════════ */

function addReadme(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet("README", { views: [{ rightToLeft: true }] });
  ws.columns = [{ width: 26 }, { width: 96 }];
  ws.getRow(1).values = ["العمود", "الشرح"];
  styleHeader(ws);

  const rows: [string, string][] = [
    ["عام", "كل الشيتات بالإنجليزية في أسماء الأعمدة. اترك خلية فارغة = القيمة الافتراضية. لا تحذف صف العناوين الأول."],
    ["Categories.slug", "معرّف القسم: حروف إنجليزية صغيرة وأرقام وشرطات فقط. يُستخدم لتحديث الأقسام الموجودة بدل تكرارها."],
    ["Categories.name_ar / name_en", "اسم القسم بالعربي والإنجليزي — مطلوب لغة واحدة على الأقل."],
    ["Categories.icon", "أيقونة اختيارية (coffee, soda, croissant, ice-cream, cake, cookie, candy, water, martini, beer, wine, sandwich, pizza, salad, soup, citrus, cherry, grape, leaf, flame, snow, star, sparkles, cup, fish, meat, chicken, banana, nuts, shisha)."],
    ["Categories.view_style", "classic_list (افتراضي) أو compact_list."],
    ["Categories.seasonal_*", "عرض القسم في شهور معينة فقط (1-12). اتركه فارغاً لعرضه دائماً. مثال موسم من نوفمبر لفبراير: 11 و 2."],
    ["Items.code", "كود الصنف: حروف إنجليزية صغيرة وأرقام وشرطات. عند التكرار يتم تحديث الصنف بدل إضافة جديد."],
    ["Items.category_slug", "معرّف القسم من شيت Categories — يجب أن يكون موجوداً في الملف أو في النظام."],
    ["Items.badges", "شارات مفصولة بـ | . المتاح: bestseller, new, hot, sugar_free, barista_pick, offer_today"],
    ["Items.prep_note", "يظهر في وضع الذروة: مثال 'وقت التحضير ~10 دقائق'."],
    ["Variants.item_code", "كود الصنف من شيت Items. كل صف = خيار سعر (حجم/تحضير)."],
    ["Variants.name_ar/en", "اسم الخيار مثل: سادة / محجو / كبير. يمكن تركه فارغاً لو الصنف سعر واحد."],
    ["Variants.price", "رقم فقط. اتركه فارغاً = صنف بدون سعر (يظهر — في المنيو)."],
    ["Variants.is_available", "متوفر؟ (افتراضي نعم). غير المتوفر يظهر 'خلصان' أو يختفي حسب إعدادات المظهر."],
    ["AddonGroups.code", "كود مجموعة الإضافات. max_select = 0 يعني بلا حدود."],
    ["Addons.group_code", "كود المجموعة من شيت AddonGroups. price_delta = فرق السعر على السعر الأساسي."],
    ["ItemAddonLinks", "لربط كل صنف بمجموعات الإضافات المناسبة: item_code + group_code لكل صف."],
    ["أوضاع الاستيراد", "دمج (Merge): يضيف الجديد ويحدّث الموجود ولا يحذف شيئاً. استبدال (Replace): يمسح كل المنيو الحالي ثم يستورد الملف — استخدمها بحذر، يمكن التراجع بعد التنفيذ من سجل العمليات."],
    ["خطوة مهمة", "استخدم 'فحص تجريبي' قبل التنفيذ دائماً — سيظهر لك ملخص ما سيحدث وكل الأخطاء قبل كتابة أي بيانات."],
  ];
  for (const [a, b] of rows) ws.addRow([a, b]);
}

/* ══════════════════ Template workbook ══════════════════ */

export async function buildTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Elsa3d Cafe Menu System";
  addReadme(wb);
  addSheet(wb, "Categories", CATEGORY_HEADERS, [["hot-drinks", "مشروبات ساخنة", "Hot Drinks", "coffee", 1, 1, "classic_list", null, null]]);
  addSheet(wb, "Items", ITEM_HEADERS, [["turkish-coffee", "hot-drinks", "قهوة تركي", "Turkish Coffee", "قهوة تركي أصلي", "Original Turkish coffee", "bestseller", "وقت التحضير ~5 دقائق", 1, 1]]);
  addSheet(wb, "Variants", VARIANT_HEADERS, [["turkish-coffee", "سادة", "Plain", 20, 1, 1, 1], ["turkish-coffee", "مظبوط", "Medium", 20, 2, 1, 1]]);
  addSheet(wb, "AddonGroups", GROUP_HEADERS, [["extra-toppings", "إضافات", "Toppings", 0, 3, 1, 1]]);
  addSheet(wb, "Addons", ADDON_HEADERS, [["extra-toppings", "قشطة", "Cream", 10, 1, 1, 1]]);
  addSheet(wb, "ItemAddonLinks", LINK_HEADERS, [["turkish-coffee", "extra-toppings"]]);
  return wb;
}

/* ══════════════════ Test fixture (بيانات تجريبية) ══════════════════ */

type Fixture = {
  categories: (string | number | null)[][];
  items: (string | number | null)[][];
  variants: (string | number | null)[][];
  groups: (string | number | null)[][];
  addons: (string | number | null)[][];
  links: (string | number | null)[][];
};

export const FIXTURE_DATA: Fixture = {
  categories: [
    ["hot-drinks", "مشروبات ساخنة", "Hot Drinks", "coffee", 1, 1, "classic_list", null, null],
    ["iced-coffee", "قهوة مثلجة", "Iced Coffee", "snow", 2, 1, "classic_list", null, null],
    ["desserts", "حلويات", "Desserts", "cake", 3, 1, "compact_list", null, null],
  ],
  items: [
    ["turkish-coffee", "hot-drinks", "قهوة تركي", "Turkish Coffee", "قهوة تركي على الرمل", "Sand-brewed Turkish coffee", "bestseller", "وقت التحضير ~5 دقائق", 1, 1],
    ["tea", "hot-drinks", "شاي", "Tea", "شاي أخضر أو أحمد", "Green or black tea", "", null, 2, 1],
    ["anise", "hot-drinks", "يانسون", "Anise", "يانسون دافئ", "Warm anise drink", "", null, 3, 1],
    ["sahlab", "hot-drinks", "سحلب", "Sahlab", "سحلب بالمكسرات والقرفة", "Sahlab with nuts & cinnamon", "bestseller|hot", "وقت التحضير ~7 دقائق", 4, 1],
    ["hot-chocolate", "hot-drinks", "هوت شوكليت", "Hot Chocolate", "شوكولاتة بلجيكية ساخنة", "Belgian hot chocolate", "new", null, 5, 1],
    ["iced-latte", "iced-coffee", "آيس لاتيه", "Iced Latte", "إسبريسو بارد مع لبن", "Chilled espresso with milk", "bestseller", null, 1, 1],
    ["spanish-latte", "iced-coffee", "لاتيه إسباني", "Spanish Latte", "لاتيه بحليب مكثف محلّى", "Latte with sweetened condensed milk", "", null, 2, 1],
    ["caramel-frappe", "iced-coffee", "فرابيه كراميل", "Caramel Frappe", "قهوة مثلجة مخفوقة بالكراميل", "Blended iced coffee with caramel", "barista_pick", null, 3, 1],
    ["affogato", "iced-coffee", "أفوجاتو", "Affogato", "آيس كريم فانيلا بإسبريسو ساخن", "Vanilla gelato with hot espresso", "new", null, 4, 1],
    ["basbousa", "desserts", "بسبوسة", "Basbousa", "بسبوسة بالقشطة", "Cream-filled semolina cake", "", null, 1, 1],
    ["mango-kunafa", "desserts", "كنافة مانجو", "Mango Kunafa", "كنافة بالمانجو الطازج", "Kunafa with fresh mango", "offer_today", null, 2, 1],
    ["lotus-cheesecake", "desserts", "تشيز كيك لوتس", "Lotus Cheesecake", "تشيز كيك بيسكويت لوتس", "Cheesecake with Lotus biscuits", "bestseller", null, 3, 1],
  ],
  variants: [
    ["turkish-coffee", "سادة", "Plain", 20, 1, 1, 1],
    ["turkish-coffee", "مظبوط", "Medium sweet", 20, 2, 1, 1],
    ["turkish-coffee", "زيادة", "Extra sweet", 20, 3, 1, 1],
    ["tea", "كوب", "Cup", 10, 1, 1, 1],
    ["tea", "براد صغير", "Small pot", 22, 2, 1, 1],
    ["anise", "كوب", "Cup", 12, 1, 1, 1],
    ["sahlab", "وسط", "Medium", 25, 1, 1, 1],
    ["sahlab", "كبير", "Large", 32, 2, 1, 1],
    ["hot-chocolate", null, null, 30, 1, 1, 1],
    ["iced-latte", "وسط", "Medium", 35, 1, 1, 1],
    ["iced-latte", "كبير", "Large", 42, 2, 1, 1],
    ["spanish-latte", "وسط", "Medium", 40, 1, 1, 1],
    ["caramel-frappe", null, null, 45, 1, 1, 1],
    ["affogato", null, null, 48, 1, 1, 1],
    ["basbousa", "قطعة", "Slice", 25, 1, 1, 1],
    ["mango-kunafa", "تقديم فردي", "Single serving", 45, 1, 1, 1],
    ["lotus-cheesecake", "قطعة", "Slice", 40, 1, 1, 1],
  ],
  groups: [
    ["sugar-option", "خيارات السكر", "Sugar options", 0, 1, 1, 1],
    ["toppings", "إضافات", "Toppings", 0, 3, 2, 1],
  ],
  addons: [
    ["sugar-option", "بدون سكر", "No sugar", 0, 1, 1, 1],
    ["sugar-option", "سكر زيادة", "Extra sugar", 0, 2, 1, 1],
    ["toppings", "قشطة", "Cream", 10, 1, 1, 1],
    ["toppings", "مكسرات", "Mixed nuts", 15, 2, 1, 1],
    ["toppings", "صوص شوكولاتة", "Chocolate sauce", 8, 3, 1, 1],
    ["toppings", "كراميل", "Caramel", 8, 4, 1, 1],
  ],
  links: [
    ["turkish-coffee", "sugar-option"],
    ["tea", "sugar-option"],
    ["anise", "sugar-option"],
    ["sahlab", "toppings"],
    ["iced-latte", "toppings"],
    ["spanish-latte", "toppings"],
    ["caramel-frappe", "toppings"],
    ["lotus-cheesecake", "toppings"],
  ],
};

export async function buildFixtureWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Elsa3d Cafe Menu System";
  const readme = wb.addWorksheet("بيانات تجريبية", { views: [{ rightToLeft: true }] });
  readme.columns = [{ width: 110 }];
  readme.addRow(["⚠️ هذه بيانات تجريبية لاختبار النظام فقط — ليست منيو كافيه السعد الحقيقي."]);
  readme.addRow(["استخدم زر 'استبدال كامل' لتنظيف النظام من البيانات التجريبية قبل رفع الكتالوج الحقيقي."]);
  addSheet(wb, "Categories", CATEGORY_HEADERS, FIXTURE_DATA.categories);
  addSheet(wb, "Items", ITEM_HEADERS, FIXTURE_DATA.items);
  addSheet(wb, "Variants", VARIANT_HEADERS, FIXTURE_DATA.variants);
  addSheet(wb, "AddonGroups", GROUP_HEADERS, FIXTURE_DATA.groups);
  addSheet(wb, "Addons", ADDON_HEADERS, FIXTURE_DATA.addons);
  addSheet(wb, "ItemAddonLinks", LINK_HEADERS, FIXTURE_DATA.links);
  return wb;
}

/* ══════════════════ Export current catalog ══════════════════ */

export async function buildExportWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Elsa3d Cafe Menu System";
  addReadme(wb);

  const cats = await db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
  const its = await db.select().from(items).orderBy(asc(items.sort), asc(items.id));
  const vs = await db.select().from(variants).orderBy(asc(variants.sort), asc(variants.id));
  const grps = await db.select().from(addonGroups).orderBy(asc(addonGroups.sort), asc(addonGroups.id));
  const adds = await db.select().from(addons).orderBy(asc(addons.sort), asc(addons.id));
  const links = await db.select().from(itemAddonGroups);

  const catById = new Map(cats.map((c) => [c.id, c]));
  const itemById = new Map(its.map((i) => [i.id, i]));
  const groupById = new Map(grps.map((g) => [g.id, g]));

  addSheet(
    wb,
    "Categories",
    CATEGORY_HEADERS,
    cats.map((c) => [c.slug, c.nameAr, c.nameEn, c.icon, c.sort, c.isActive ? 1 : 0, c.viewStyle, c.seasonalStartMonth, c.seasonalEndMonth]),
  );
  addSheet(
    wb,
    "Items",
    ITEM_HEADERS,
    its.map((i) => [
      i.code,
      catById.get(i.categoryId)?.slug ?? "",
      i.nameAr,
      i.nameEn,
      i.descAr,
      i.descEn,
      (i.badges ?? []).join("|"),
      i.prepNote,
      i.sort,
      i.isActive ? 1 : 0,
    ]),
  );
  addSheet(
    wb,
    "Variants",
    VARIANT_HEADERS,
    vs.map((v) => [
      itemById.get(v.itemId)?.code ?? "",
      v.nameAr,
      v.nameEn,
      v.price === null ? null : Number(v.price),
      v.sort,
      v.isActive ? 1 : 0,
      v.isAvailable ? 1 : 0,
    ]),
  );
  addSheet(
    wb,
    "AddonGroups",
    GROUP_HEADERS,
    grps.map((g) => [g.code, g.nameAr, g.nameEn, g.minSelect, g.maxSelect, g.sort, g.isActive ? 1 : 0]),
  );
  addSheet(
    wb,
    "Addons",
    ADDON_HEADERS,
    adds.map((a) => [
      groupById.get(a.groupId)?.code ?? "",
      a.nameAr,
      a.nameEn,
      Number(a.priceDelta),
      a.sort,
      a.isActive ? 1 : 0,
      a.isAvailable ? 1 : 0,
    ]),
  );
  addSheet(
    wb,
    "ItemAddonLinks",
    LINK_HEADERS,
    links.map((l) => [itemById.get(l.itemId)?.code ?? "", groupById.get(l.groupId)?.code ?? ""]),
  );
  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
