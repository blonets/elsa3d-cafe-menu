import { NextRequest, NextResponse } from "next/server";
import { hasValidSession } from "@/lib/auth";
import { qrPng } from "@/lib/qr";
import { MENU_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

/** GET /api/admin/qr-preview?dark=%23xxx&logo=1&v=url → inline PNG preview */
export async function GET(req: NextRequest) {
  if (!(await hasValidSession())) return new NextResponse("unauthorized", { status: 401 });
  const p = new URL(req.url).searchParams;
  const dark = /^#[0-9a-fA-F]{6}$/.test(p.get("dark") ?? "") ? p.get("dark")! : "#1c1917";
  const withLogo = p.get("logo") !== "0";
  const url = (p.get("v") || MENU_URL).slice(0, 500);
  const png = await qrPng(url, { size: 512, dark, light: "#ffffff", withLogo });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
