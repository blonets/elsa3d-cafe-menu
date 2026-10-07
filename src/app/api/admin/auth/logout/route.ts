import { NextResponse } from "next/server";
import { hasValidSession, clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (await hasValidSession()) {
    await clearSessionCookie();
  }
  return NextResponse.json({ ok: true });
}
