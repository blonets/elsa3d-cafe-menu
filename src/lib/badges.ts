export const BADGES = ["bestseller", "new", "hot", "sugar_free", "barista_pick", "offer_today"] as const;
export type Badge = (typeof BADGES)[number];

export const BADGE_LABELS_AR: Record<Badge, string> = {
  bestseller: "الأكثر طلباً",
  new: "جديد",
  hot: "ساخن 🔥",
  sugar_free: "بدون سكر",
  barista_pick: "اختيار الباريستا",
  offer_today: "عرض اليوم",
};

export const BADGE_LABELS_EN: Record<Badge, string> = {
  bestseller: "Bestseller",
  new: "New",
  hot: "Hot 🔥",
  sugar_free: "Sugar-free",
  barista_pick: "Barista's pick",
  offer_today: "Today's offer",
};

export const BADGE_STYLES: Record<Badge, string> = {
  bestseller: "badge-bestseller",
  new: "badge-new",
  hot: "badge-hot",
  sugar_free: "badge-sugar",
  barista_pick: "badge-barista",
  offer_today: "badge-offer",
};

export function parseBadges(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[|,/]/)
    .map((b) => b.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((b): b is Badge => (BADGES as readonly string[]).includes(b));
}
