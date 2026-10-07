import { asc } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, categories, items, variants } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ItemsManager from "@/components/admin/ItemsManager";

export const dynamic = "force-dynamic";

export default async function AdminItemsPage() {
  await requireAdmin();

  const cats = await db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
  const its = await db.select().from(items).orderBy(asc(items.sort), asc(items.id));
  const vs = await db.select().from(variants).orderBy(asc(variants.sort), asc(variants.id));
  const groups = await db.select({ id: addonGroups.id, nameAr: addonGroups.nameAr }).from(addonGroups).orderBy(asc(addonGroups.sort));

  return (
    <div className="max-w-6xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">إدارة الأصناف</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          عدّل الأسعار والتوفر مباشرة — التغييرات تظهر في المنيو خلال ثواني
        </p>
      </header>
      <ItemsManager
        categories={cats.map((c) => ({ id: c.id, slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn, isActive: c.isActive }))}
        items={its.map((i) => ({
          id: i.id,
          code: i.code,
          categoryId: i.categoryId,
          nameAr: i.nameAr,
          nameEn: i.nameEn,
          descAr: i.descAr,
          descEn: i.descEn,
          badges: i.badges ?? [],
          prepNote: i.prepNote,
          isActive: i.isActive,
          isAvailable: i.isAvailable,
          variants: vs
            .filter((v) => v.itemId === i.id)
            .map((v) => ({ id: v.id, nameAr: v.nameAr, nameEn: v.nameEn, price: v.price, isActive: v.isActive, isAvailable: v.isAvailable })),
        }))}
        addonGroups={groups}
      />
    </div>
  );
}
