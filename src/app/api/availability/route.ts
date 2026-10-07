import { NextResponse } from "next/server";
import { getUnavailableIds } from "@/lib/menu-data";
import { maybePrune } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    void maybePrune();
    const data = await getUnavailableIds();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ items: [], variants: [], peakMode: false, oosMode: "hide" }, { status: 200 });
  }
}
