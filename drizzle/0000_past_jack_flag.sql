CREATE TABLE "addon_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "addon_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"price_delta" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily" (
	"day" date PRIMARY KEY NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	"item_views" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"top_searches" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"item_id" integer,
	"table_no" integer,
	"term" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor" text DEFAULT 'admin' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"summary" text,
	"before" jsonb,
	"after" jsonb,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"icon" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_style" text DEFAULT 'classic_list' NOT NULL,
	"seasonal_start_month" integer,
	"seasonal_end_month" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "item_addon_groups" (
	"item_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	CONSTRAINT "item_addon_groups_item_id_group_id_pk" PRIMARY KEY("item_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"desc_ar" text,
	"desc_en" text,
	"badges" text[] DEFAULT '{}' NOT NULL,
	"prep_note" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"cafe_name_ar" text DEFAULT 'كافيه السعد' NOT NULL,
	"cafe_name_en" text DEFAULT 'Elsa3d Cafe' NOT NULL,
	"phone" text DEFAULT '+201025617078' NOT NULL,
	"whatsapp" text DEFAULT '201025617078' NOT NULL,
	"currency_label" text DEFAULT 'ج.م' NOT NULL,
	"primary_color" text DEFAULT '#1c1917' NOT NULL,
	"accent_color" text DEFAULT '#b8860b' NOT NULL,
	"font_choice" text DEFAULT 'cairo' NOT NULL,
	"default_mode" text DEFAULT 'auto' NOT NULL,
	"announcement" text,
	"announcement_active" boolean DEFAULT false NOT NULL,
	"announcement_expires_at" timestamp with time zone,
	"oos_display_mode" text DEFAULT 'hide' NOT NULL,
	"peak_mode" boolean DEFAULT false NOT NULL,
	"footer_note_ar" text,
	"footer_note_en" text,
	"working_hours" text,
	"admin_password_hash" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"name_ar" text,
	"name_en" text,
	"price" numeric(10, 2),
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_group_id_addon_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."addon_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_addon_groups" ADD CONSTRAINT "item_addon_groups_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_addon_groups" ADD CONSTRAINT "item_addon_groups_group_id_addon_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."addon_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addons_group_idx" ON "addons" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "analytics_events_created_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "variants_item_idx" ON "variants" USING btree ("item_id");