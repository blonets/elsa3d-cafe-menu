import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories, items } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import CategoriesManager from "@/components/admin/CategoriesManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const cats = await db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
  const its = await db.select({ id: items.id, categoryId: items.categoryId }).from(items);

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">الأقسام</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          اسحب لإعادة الترتيب — الترتيب هو نفسه ترتيب الظهور في المنيو
        </p>
      </header>
      <CategoriesManager
        categories={cats.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          icon: c.icon,
          isActive: c.isActive,
          viewStyle: c.viewStyle,
          seasonalStartMonth: c.seasonalStartMonth,
          seasonalEndMonth: c.seasonalEndMonth,
          itemCount: its.filter((i) => i.categoryId === c.id).length,
        }))}
      />
    </div>
  );
}
