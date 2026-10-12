import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
import { maybePrune } from "@/lib/analytics";
import { clientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

const payload = z.object({
  type: z.enum(["scan", "item_view", "search"]),
  itemId: z.number().int().positive().optional(),
  tableNo: z.number().int().positive().max(999).optional(),
  term: z.string().trim().max(80).optional(),
});

// Lightweight in-memory rate limiter per IP: max 30 pings / 60 seconds
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_PINGS_PER_MINUTE = 30;
const BUCKET_TTL_MS = 60_000;

function isAllowed(ip: string): boolean {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + BUCKET_TTL_MS };
    ipBuckets.set(ip, b);
    if (ipBuckets.size > 2000) {
      for (const [k, v] of ipBuckets.entries()) {
        if (now > v.resetAt) ipBuckets.delete(k);
      }
    }
    return true;
  }
  b.count++;
  return b.count <= MAX_PINGS_PER_MINUTE;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!isAllowed(ip)) {
      return new NextResponse(null, { status: 204 });
    }

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
