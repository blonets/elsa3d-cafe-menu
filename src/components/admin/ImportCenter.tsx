"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, FileSpreadsheet, FlaskConical, AlertTriangle, Undo2, CheckCircle2, XCircle } from "lucide-react";

type PreviewSummary = {
  mode: string;
  categories: { created: number; updated: number };
  items: { created: number; updated: number };
  variants: { created: number; updated: number };
  addonGroups: { created: number; updated: number };
  addons: { created: number; updated: number };
  links: { created: number; unchanged: number };
};

type Preview = {
  ok: boolean;
  summary: PreviewSummary;
  errors: { sheet: string; row: number; message: string }[];
  warnings: { sheet: string; row: number; message: string }[];
  skipped: number;
  samples: { sheet: string; label: string; detail: string }[];
};

export default function ImportCenter() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [ignoreInvalid, setIgnoreInvalid] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "execute">("");
  const [result, setResult] = useState<{ ok: boolean; auditId?: number; message: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
  };

  const post = async (step: "dry-run" | "execute") => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("step", step);
    fd.append("mode", mode);
    fd.append("ignoreInvalid", ignoreInvalid ? "1" : "0");
    if (mode === "replace" && step === "execute") fd.append("confirm", confirmText);

    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({ error: "رد غير صالح من السيرفر" }));
    if (!res.ok) {
      if (data.preview) setPreview(data.preview as Preview);
      setResult({ ok: false, message: data.error ?? "فشل التنفيذ" });
      return null;
    }
    return data;
  };

  const runPreview = async () => {
    setBusy("preview");
    setResult(null);
    const data = await post("dry-run");
    if (data) setPreview(data as Preview);
    setBusy("");
  };

  const runExecute = async () => {
    setBusy("execute");
    const data = await post("execute");
    setBusy("");
    if (data?.ok) {
      setResult({ ok: true, auditId: data.auditId, message: summarize(data.summary as PreviewSummary) });
      setPreview(null);
      pickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } else if (data) {
      setResult({ ok: false, message: "فشل الاستيراد" });
    }
  };

  const undoLast = async (auditId: number) => {
    const fd = new FormData();
    fd.append("step", "undo");
    fd.append("auditId", String(auditId));
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({ ok: false, message: "فشل الاتصال" }));
    setResult({ ok: Boolean(data.ok), message: data.message ?? "تم" });
    router.refresh();
  };

  const download = (type: string) => {
    window.location.href = `/api/admin/catalog-file?type=${type}`;
  };

  return (
    <div className="space-y-4">
      {/* Downloads */}
      <div className="grid sm:grid-cols-3 gap-3">
        <ActionButton icon={FileSpreadsheet} title="تحميل القالب" desc="ملف Excel جاهز بشرح عربي لكل عمود" onClick={() => download("template")} />
        <ActionButton icon={FlaskConical} title="بيانات تجريبية" desc="عينة صغيرة لاختبار النظام (12 صنف)" onClick={() => download("fixture")} />
        <ActionButton icon={Download} title="تصدير الحالي" desc="نسخة احتياطية من المنيو الحالي" onClick={() => download("export")} />
      </div>

      {/* Upload */}
      <div
        className={`card p-6 border-2 border-dashed text-center transition-colors ${dragOver ? "!border-amber-500" : ""}`}
        style={{ borderColor: dragOver ? undefined : "var(--line)" }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
      >
        <Upload size={28} className="mx-auto opacity-40" />
        <p className="font-bold text-[14.5px] mt-2">ارفع ملف المنيو (.xlsx)</p>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
          اسحب الملف هنا أو اختَره — الحد الأقصى 25MB
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm mt-3">
          اختيار ملف
        </button>
        {file && (
          <p className="text-[13px] font-bold mt-3" style={{ color: "var(--brand-accent)" }}>
            📄 {file.name} ({(file.size / 1024).toFixed(0)}KB)
          </p>
        )}
      </div>

      {/* Mode */}
      <div className="card p-5 space-y-3">
        <h3 className="font-extrabold text-[15px]">وضع الاستيراد</h3>
        <label className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${mode === "merge" ? "!border-amber-500" : ""}`} style={{ borderColor: mode === "merge" ? undefined : "var(--line)" }}>
          <input type="radio" className="mt-1" checked={mode === "merge"} onChange={() => setMode("merge")} />
          <div>
            <p className="font-extrabold text-[14px]">دمج (موصى به)</p>
            <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
              يضيف الأصناف الجديدة ويحدّث الموجود (بالـ slug/code) — مش بيحذف أي حاجة موجودة
            </p>
          </div>
        </label>
        <label className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${mode === "replace" ? "!border-red-500" : ""}`} style={{ borderColor: mode === "replace" ? undefined : "var(--line)" }}>
          <input type="radio" className="mt-1" checked={mode === "replace"} onChange={() => setMode("replace")} />
          <div>
            <p className="font-extrabold text-[14px] !text-red-600">استبدال كامل ⚠️</p>
            <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
              يمسح كل المنيو الحالي ويستورد الملف من الصفر — بيتم أخذ نسخة كاملة قبل التنفيذ ويمكن التراجع بخطوة واحدة
            </p>
          </div>
        </label>
        {mode === "replace" && (
          <label className="block ps-1">
            <span className="text-[12.5px] font-bold mb-1 block">
              اكتب <span className="text-red-600 font-extrabold">استبدال</span> للتأكيد:
            </span>
            <input className="inp !w-48" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="استبدال" />
          </label>
        )}
        <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer select-none">
          <input type="checkbox" checked={ignoreInvalid} onChange={(e) => setIgnoreInvalid(e.target.checked)} className="w-4 h-4" />
          تجاهل الصفوف الفاسدة (بدل إيقاف الاستيراد كله) — بتظهر في التقرير
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={runPreview} disabled={!file || busy !== ""} className="btn btn-ghost">
          {busy === "preview" ? "بيفحص…" : "فحص تجريبي (بدون كتابة)"}
        </button>
        <button
          onClick={runExecute}
          disabled={!file || busy !== "" || !preview?.ok || (mode === "replace" && confirmText !== "استبدال")}
          className="btn btn-primary"
        >
          {busy === "execute" ? "بيستورد…" : "تنفيذ الاستيراد"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`card p-4 flex items-start gap-3 ${result.ok ? "!border-green-500" : "!border-red-400"}`} style={{ borderColor: undefined }}>
          {result.ok ? <CheckCircle2 size={18} className="text-green-600 mt-0.5" /> : <XCircle size={18} className="text-red-500 mt-0.5" />}
          <div className="flex-1">
            <p className="font-extrabold text-[14px]">{result.ok ? "تم الاستيراد بنجاح" : "اتوقف الاستيراد"}</p>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--ink-soft)" }}>
              {result.message}
            </p>
            {result.ok && result.auditId && (
              <button onClick={() => undoLast(result.auditId!)} className="btn btn-ghost btn-sm mt-2">
                <Undo2 size={13} /> تراجع عن الاستيراد ده
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="card p-5 space-y-4">
          <h3 className="font-extrabold text-[15px] flex items-center gap-2">
            {preview.ok ? "نتيجة الفحص التجريبي" : "مفيش استيراد — فيه أخطاء لازم تتصلح"}
          </h3>

          {preview.ok && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[13px]">
              <SummaryLine label="أقسام" s={preview.summary.categories} />
              <SummaryLine label="أصناف" s={preview.summary.items} />
              <SummaryLine label="أسعار" s={preview.summary.variants} />
              <SummaryLine label="مجموعات إضافات" s={preview.summary.addonGroups} />
              <SummaryLine label="إضافات" s={preview.summary.addons} />
              <SummaryLine label="روابط" s={{ created: preview.summary.links.created, updated: preview.summary.links.unchanged }} />
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div>
              <p className="text-[13px] font-extrabold text-amber-600 mb-1">تحذيرات ({preview.warnings.length})</p>
              <ul className="text-[12.5px] space-y-1 list-disc ps-5" style={{ color: "var(--ink-soft)" }}>
                {preview.warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>
                    {w.sheet} صف {w.row}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-xl border border-red-300 p-3">
              <p className="text-[13px] font-extrabold text-red-600 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={14} /> أخطاء ({preview.errors.length})
                {preview.skipped > 0 && <span className="chip">هتتخطى {preview.skipped} صف</span>}
              </p>
              <ul className="text-[12.5px] space-y-1 max-h-52 overflow-y-auto">
                {preview.errors.slice(0, 30).map((e, i) => (
                  <li key={i} className="font-bold">
                    <span className="chip !py-0.5 me-1">{e.sheet} · صف {e.row}</span> {e.message}
                  </li>
                ))}
                {preview.errors.length > 30 && <li className="opacity-60">… و{preview.errors.length - 30} خطأ كمان</li>}
              </ul>
            </div>
          )}

          {preview.ok && preview.samples.length > 0 && (
            <div>
              <p className="text-[13px] font-extrabold mb-1.5">أول صفوف من الملف</p>
              <div className="table-wrap max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--line)" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الشيت</th>
                      <th>البيان</th>
                      <th>تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.samples.map((s, i) => (
                      <tr key={i}>
                        <td className="chip !py-0.5">{s.sheet}</td>
                        <td className="font-bold">{s.label}</td>
                        <td className="opacity-70" dir="auto">
                          {s.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function summarize(s: PreviewSummary): string {
  return `أقسام: +${s.categories.created} ~${s.categories.updated} · أصناف: +${s.items.created} ~${s.items.updated} · أسعار: +${s.variants.created} ~${s.variants.updated}`;
}

function SummaryLine({ label, s }: { label: string; s: { created: number; updated: number } }) {
  return (
    <div className="rounded-lg border px-3 py-2 flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
      <span className="font-bold">{label}</span>
      <span className="opacity-80">
        {s.created > 0 && <span className="text-green-600 font-extrabold">+{s.created}</span>}
        {s.created > 0 && s.updated > 0 && " · "}
        {s.updated > 0 && <span>تحديث {s.updated}</span>}
        {s.created === 0 && s.updated === 0 && <span className="opacity-40">—</span>}
      </span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Download;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card p-4 text-start hover:!border-amber-500 transition-colors group">
      <Icon size={18} className="opacity-60 group-hover:opacity-100" />
      <p className="font-extrabold text-[14px] mt-2">{title}</p>
      <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
        {desc}
      </p>
    </button>
  );
}
