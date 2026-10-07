import { NextRequest, NextResponse } from "next/server";
import { hasValidSession } from "@/lib/auth";
import { buildExportWorkbook, buildTemplateWorkbook, buildFixtureWorkbook, workbookToBuffer } from "@/lib/import/template";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/admin/catalog-file?type=export|template|fixture → XLSX download */
export async function GET(req: NextRequest) {
  if (!(await hasValidSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "export";
  let wb;
  let name = "menu-export.xlsx";
  if (type === "template") {
    wb = await buildTemplateWorkbook();
    name = "menu-template.xlsx";
  } else if (type === "fixture") {
    wb = await buildFixtureWorkbook();
    name = "sample-import.xlsx";
  } else {
    wb = await buildExportWorkbook();
    name = `menu-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
  const buf = await workbookToBuffer(wb);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
