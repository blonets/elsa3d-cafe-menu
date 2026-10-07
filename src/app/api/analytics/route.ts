import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
import { maybePrune } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const payload = z.object({
  type: z.enum(["scan", "item_view", "search"]),
  itemId: z.number().int().positive().optional(),
  tableNo: z.number().int().positive().max(999).optional(),
  term: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = payload.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const { type, itemId, tableNo, term } = parsed.data;
    if (type !== "search") void maybePrune();
    await db.insert(analyticsEvents).values({ type, itemId: itemId ?? null, tableNo: tableNo ?? null, term: term ?? null });
  } catch {
    // never fail analytics
  }
  return new NextResponse(null, { status: 204 });
}
