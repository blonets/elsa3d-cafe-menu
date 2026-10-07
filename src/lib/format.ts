/** Price formatting — numeric(10,2) arrives as string from drizzle. */

export function fmtPrice(v: string | number | null | undefined, currency: string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  const str = Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
  return `${str} ${currency}`;
}

export function fmtPricePlain(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

export function priceOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  if (Number.isNaN(n) || n < 0) return null;
  return n.toFixed(2);
}
