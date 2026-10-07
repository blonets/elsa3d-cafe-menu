"use server";

import { revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin, checkCredentials } from "@/lib/auth";
import { updateSettings } from "@/lib/settings";
import { writeAudit } from "@/lib/audit";
import { undoAuditOperation } from "@/lib/import/apply";

function refresh() {
  revalidateTag("menu");
}

export async function updateBrandInfo(patch: {
  cafeNameAr?: string;
  cafeNameEn?: string;
  phone?: string;
  whatsapp?: string;
  currencyLabel?: string;
}): Promise<{ ok: boolean }> {
  await requireAdmin();
  await updateSettings(patch);
  refresh();
  return { ok: true };
}

export async function updateAnnouncement(data: {
  announcement: string;
  active: boolean;
  expiresAt?: string | null;
}): Promise<{ ok: boolean }> {
  await requireAdmin();
  await updateSettings({
    announcement: data.announcement.trim() || null,
    announcementActive: data.active && Boolean(data.announcement.trim()),
    announcementExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  });
  refresh();
  return { ok: true };
}

export async function updateAppearance(patch: {
  primaryColor?: string;
  accentColor?: string;
  fontChoice?: string;
  defaultMode?: string;
  oosDisplayMode?: string;
  peakMode?: boolean;
  footerNoteAr?: string | null;
  footerNoteEn?: string | null;
  workingHours?: string | null;
}): Promise<{ ok: boolean }> {
  await requireAdmin();
  const hex = (v?: string) => (/^#[0-9a-fA-F]{3,8}$/.test(v ?? "") ? v : undefined);
  await updateSettings({
    ...(patch.primaryColor !== undefined ? { primaryColor: hex(patch.primaryColor) ?? "#1c1917" } : {}),
    ...(patch.accentColor !== undefined ? { accentColor: hex(patch.accentColor) ?? "#b8860b" } : {}),
    ...(patch.fontChoice !== undefined ? { fontChoice: ["cairo", "amiri-headings"].includes(patch.fontChoice) ? patch.fontChoice : "cairo" } : {}),
    ...(patch.defaultMode !== undefined ? { defaultMode: ["auto", "light", "dark"].includes(patch.defaultMode) ? patch.defaultMode : "auto" } : {}),
    ...(patch.oosDisplayMode !== undefined ? { oosDisplayMode: ["hide", "gray"].includes(patch.oosDisplayMode) ? patch.oosDisplayMode : "hide" } : {}),
    ...(patch.peakMode !== undefined ? { peakMode: patch.peakMode } : {}),
    ...(patch.footerNoteAr !== undefined ? { footerNoteAr: patch.footerNoteAr || null } : {}),
    ...(patch.footerNoteEn !== undefined ? { footerNoteEn: patch.footerNoteEn || null } : {}),
    ...(patch.workingHours !== undefined ? { workingHours: patch.workingHours || null } : {}),
  });
  refresh();
  return { ok: true };
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (data.newPassword.length < 8) return { ok: false, error: "كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل" };
  const okCreds = await checkCredentials(process.env.ADMIN_USERNAME || "admin", data.currentPassword);
  if (!okCreds) return { ok: false, error: "كلمة السر الحالية غير صحيحة" };
  const hash = await bcrypt.hash(data.newPassword, 10);
  await db.update(settings).set({ adminPasswordHash: hash, updatedAt: new Date() }).where(eq(settings.id, 1));
  await writeAudit({ action: "settings.password", entityType: "settings", summary: "تغيير كلمة سر الأدمن" });
  return { ok: true };
}

export async function undoOperation(auditId: number): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const res = await undoAuditOperation(auditId);
  return res;
}
