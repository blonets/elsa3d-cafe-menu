import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  bigserial,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/** Singleton settings row (id = 1). */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  cafeNameAr: text("cafe_name_ar").notNull().default("كافيه السعد"),
  cafeNameEn: text("cafe_name_en").notNull().default("Elsa3d Cafe"),
  phone: text("phone").notNull().default("+201025617078"),
  whatsapp: text("whatsapp").notNull().default("201025617078"),
  currencyLabel: text("currency_label").notNull().default("ج.م"),
  primaryColor: text("primary_color").notNull().default("#1c1917"),
  accentColor: text("accent_color").notNull().default("#b8860b"),
  fontChoice: text("font_choice").notNull().default("cairo"),
  defaultMode: text("default_mode").notNull().default("auto"), // auto | light | dark
  announcement: text("announcement"),
  announcementActive: boolean("announcement_active").notNull().default(false),
  announcementExpiresAt: timestamp("announcement_expires_at", { withTimezone: true }),
  oosDisplayMode: text("oos_display_mode").notNull().default("hide"), // hide | gray
  peakMode: boolean("peak_mode").notNull().default(false),
  footerNoteAr: text("footer_note_ar"),
  footerNoteEn: text("footer_note_en"),
  workingHours: text("working_hours"),
  adminPasswordHash: text("admin_password_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon"),
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  viewStyle: text("view_style").notNull().default("classic_list"), // classic_list | compact_list
  seasonalStartMonth: integer("seasonal_start_month"),
  seasonalEndMonth: integer("seasonal_end_month"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descAr: text("desc_ar"),
    descEn: text("desc_en"),
    badges: text("badges").array().notNull().default([]),
    prepNote: text("prep_note"),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_category_idx").on(t.categoryId)],
);

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    nameAr: text("name_ar"),
    nameEn: text("name_en"),
    price: numeric("price", { precision: 10, scale: 2 }),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (t) => [index("variants_item_idx").on(t.itemId)],
);

export const addonGroups = pgTable("addon_groups", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(0), // 0 = unlimited
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const addons = pgTable(
  "addons",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => addonGroups.id, { onDelete: "cascade" }),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    priceDelta: numeric("price_delta", { precision: 10, scale: 2 }).notNull().default("0"),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (t) => [index("addons_group_idx").on(t.groupId)],
);

export const itemAddonGroups = pgTable(
  "item_addon_groups",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => addonGroups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.groupId] })],
);

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull().default("admin"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary"),
  before: jsonb("before"),
  after: jsonb("after"),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(), // scan | item_view | search
    itemId: integer("item_id"),
    tableNo: integer("table_no"),
    term: text("term"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_events_created_idx").on(t.createdAt), index("analytics_events_type_idx").on(t.type)],
);

export const analyticsDaily = pgTable("analytics_daily", {
  day: date("day").primaryKey(),
  scans: integer("scans").notNull().default(0),
  itemViews: jsonb("item_views").notNull().default({}), // { [itemId]: count }
  topSearches: jsonb("top_searches").notNull().default({}), // { [term]: count }
});

export type Settings = typeof settings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type AddonGroup = typeof addonGroups.$inferSelect;
export type Addon = typeof addons.$inferSelect;
export type Audit = typeof audits.$inferSelect;
