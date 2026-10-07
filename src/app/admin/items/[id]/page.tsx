import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addonGroups, categories, itemAddonGroups, items, variants } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ItemEditor from "@/components/admin/ItemEditor";

export const dynamic = "force-dynamic";

export default async function ItemEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();

  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) notFound();

  const [itemVariants, cats, groups, links] = await Promise.all([
    db.select().from(variants).where(eq(variants.itemId, itemId)).orderBy(asc(variants.sort), asc(variants.id)),
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id)),
    db.select().from(addonGroups).orderBy(asc(addonGroups.sort), asc(addonGroups.id)),
    db.select().from(itemAddonGroups).where(eq(itemAddonGroups.itemId, itemId)),
  ]);

  return (
    <div className="max-w-3xl">
      <ItemEditor
        item={{
          id: item.id,
          code: item.code,
          categoryId: item.categoryId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          descAr: item.descAr,
          descEn: item.descEn,
          badges: item.badges ?? [],
          prepNote: item.prepNote,
          isActive: item.isActive,
          isAvailable: item.isAvailable,
        }}
        variants={itemVariants.map((v) => ({
          id: v.id,
          nameAr: v.nameAr,
          nameEn: v.nameEn,
          price: v.price,
          isActive: v.isActive,
          isAvailable: v.isAvailable,
        }))}
        categories={cats.map((c) => ({ id: c.id, nameAr: c.nameAr }))}
        addonGroups={groups.map((g) => ({ id: g.id, nameAr: g.nameAr, nameEn: g.nameEn }))}
        linkedGroupIds={links.map((l) => l.groupId)}
      />
    </div>
  );
}
