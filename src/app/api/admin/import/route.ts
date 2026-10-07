import { NextRequest, NextResponse } from "next/server";
import { hasValidSession } from "@/lib/auth";
import { parseWorkbook } from "@/lib/import/parse";
import { buildPreview, executeMerge, executeReplace, undoAuditOperation, type ImportMode } from "@/lib/import/apply";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function guard(): Promise<boolean> {
  return await hasValidSession();
}

/**
 * POST multipart/form-data:
 *  file: XLSX | step: "dry-run" | "execute" | mode: "merge"|"replace" | ignoreInvalid: "1" | confirm: "استبدال"
 */
export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const step = String(form.get("step") ?? "dry-run");

  if (step === "undo") {
    const auditId = Number(form.get("auditId"));
    if (!Number.isInteger(auditId)) return NextResponse.json({ error: "auditId مطلوب" }, { status: 400 });
    const res = await undoAuditOperation(auditId);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ارفع ملف XLSX أولاً" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "الملف أكبر من 25MB" }, { status: 400 });
  }

  const mode = (String(form.get("mode") ?? "merge") === "replace" ? "replace" : "merge") as ImportMode;
  const ignoreInvalid = String(form.get("ignoreInvalid") ?? "0") === "1";

  let parsed;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    parsed = await parseWorkbook(buf);
  } catch {
    return NextResponse.json(
      { error: "مش قادر أقرأ الملف — اتأكد إنه ملف Excel حقيقي (.xlsx) وإن مفيش كلمة سر عليه" },
      { status: 400 },
    );
  }

  if (step === "dry-run") {
    const preview = await buildPreview(parsed, mode, ignoreInvalid);
    return NextResponse.json(preview);
  }

  if (step === "execute") {
    if (mode === "replace" && String(form.get("confirm") ?? "") !== "استبدال") {
      return NextResponse.json(
        { error: "تأكيد الاستبدال ناقص — اكتب كلمة 'استبدال' في خانة التأكيد" },
        { status: 400 },
      );
    }
    const preview = await buildPreview(parsed, mode, ignoreInvalid);
    if (!preview.ok) {
      return NextResponse.json({ error: "فيه أخطاء في الملف — شغّل الفحص التجريبي وشوف التقرير", preview });
    }
    try {
      const result = mode === "replace" ? await executeReplace(parsed) : await executeMerge(parsed);
      return NextResponse.json({ ok: true, auditId: result.auditId, summary: result.summary, warnings: parsed.warnings });
    } catch (e) {
      const msg = e instanceof Error && e.message === "IMPORT_VALIDATION_ERRORS" ? "فيه أخطاء في الملف" : "فشل الاستيراد — جرب تاني";
      console.error("[import] failed", e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "خطوة غير معروفة" }, { status: 400 });
}
