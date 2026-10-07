import { asc } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, addons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import AddonsManager from "@/components/admin/AddonsManager";

export const dynamic = "force-dynamic";

export default async function AdminAddonsPage() {
  await requireAdmin();
  const groups = await db.select().from(addonGroups).orderBy(asc(addonGroups.sort), asc(addonGroups.id));
  const adds = await db.select().from(addons).orderBy(asc(addons.sort), asc(addons.id));

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">مجموعات الإضافات</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          زي: إضافات الشيشة، التوبينج، خيارات السكر — وتربطها بالأصناف من محرر الصنف
        </p>
      </header>
      <AddonsManager
        groups={groups.map((g) => ({
          id: g.id,
          code: g.code,
          nameAr: g.nameAr,
          nameEn: g.nameEn,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          isActive: g.isActive,
          addons: adds
            .filter((a) => a.groupId === g.id)
            .map((a) => ({ id: a.id, nameAr: a.nameAr, nameEn: a.nameEn, priceDelta: a.priceDelta, isAvailable: a.isAvailable })),
        }))}
      />
    </div>
  );
}
