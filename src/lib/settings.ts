import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type Settings } from "@/db/schema";

/** Settings row (cached per request via React cache is unnecessary — cheap query). */
export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return (
    rows[0] ?? {
      id: 1,
      cafeNameAr: "كافيه السعد",
      cafeNameEn: "Elsa3d Cafe",
      phone: "+201025617078",
      whatsapp: "201025617078",
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
      adminPasswordHash: null,
      updatedAt: new Date(),
    }
  );
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db
    .insert(settings)
    .values({ id: 1, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.id, set: { ...patch, updatedAt: new Date() } });
}

export function isAnnouncementLive(s: {
  announcementActive: boolean;
  announcement: string | null;
  announcementExpiresAt: Date | null;
}): boolean {
  if (!s.announcementActive || !s.announcement) return false;
  if (s.announcementExpiresAt && s.announcementExpiresAt.getTime() < Date.now()) return false;
  return true;
}
