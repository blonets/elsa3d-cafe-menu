import { NextRequest, NextResponse } from "next/server";
import { hasValidSession } from "@/lib/auth";
import { qrPng, qrSvg, tableQrZip } from "@/lib/qr";
import { MENU_URL } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST application/json:
 * { kind: "single"|"batch", url?, count?, size?, format: "png"|"svg"|"zip", withLogo?, dark?, light? }
 */
export async function POST(req: NextRequest) {
  if (!(await hasValidSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    kind?: string;
    url?: string;
    count?: number;
    size?: number;
    format?: string;
    withLogo?: boolean;
    dark?: string;
    light?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const dark = /^#[0-9a-fA-F]{6}$/.test(body.dark ?? "") ? body.dark : undefined;
  const light = /^#[0-9a-fA-F]{6}$/.test(body.light ?? "") ? body.light : undefined;
  const withLogo = body.withLogo !== false;
  const size = [512, 1024, 2048].includes(body.size ?? 1024) ? body.size! : 1024;

  if (body.kind === "batch") {
    const count = Math.min(Math.max(Number(body.count) || 10, 1), 100);
    const zip = await tableQrZip(MENU_URL, count);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="table-qr-${count}.zip"`,
      },
    });
  }

  const url = (body.url || MENU_URL).slice(0, 500);
  const format = body.format === "svg" ? "svg" : "png";

  if (format === "svg") {
    const svg = await qrSvg(url, { dark, light, withLogo });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-menu.svg"`,
      },
    });
  }
  const png = await qrPng(url, { size, dark, light, withLogo });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-menu-${size}.png"`,
    },
  });
}
