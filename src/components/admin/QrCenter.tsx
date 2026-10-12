"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Table2, Printer, Layers, FileText } from "lucide-react";

export default function QrCenter({
  menuUrl,
  accent,
  primary,
}: {
  menuUrl: string;
  accent: string;
  primary: string;
}) {
  const [url, setUrl] = useState(menuUrl);
  const [size, setSize] = useState(1024);
  const [withLogo, setWithLogo] = useState(true);
  const [dark, setDark] = useState(primary);
  const [busy, setBusy] = useState("");

  // Table Print State
  const [tableMode, setTableMode] = useState<"range" | "single">("range");
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(10);
  const [singleTable, setSingleTable] = useState(1);
  const [printSize, setPrintSize] = useState<"10" | "15">("10");

  const downloadSingle = async (format: "png" | "svg") => {
    setBusy(format);
    const res = await fetch("/api/admin/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "single", url, size, format, withLogo, dark, light: "#ffffff" }),
    });
    if (res.ok) {
      const blob = await res.blob();
      triggerDownload(blob, format === "svg" ? "qr-menu.svg" : `qr-menu-${size}.png`);
    }
    setBusy("");
  };

  const downloadBatch = async () => {
    setBusy("zip");
    const payload =
      tableMode === "single"
        ? { kind: "batch", start: singleTable, end: singleTable }
        : { kind: "batch", start: startTable, end: endTable };

    const res = await fetch("/api/admin/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const blob = await res.blob();
      const filename =
        tableMode === "single"
          ? `table-qr-${singleTable}.zip`
          : `table-qr-${startTable}-to-${endTable}.zip`;
      triggerDownload(blob, filename);
    }
    setBusy("");
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printSheetUrl =
    tableMode === "single"
      ? `/admin/qr/print?table=${singleTable}&size=${printSize}`
      : `/admin/qr/print?start=${startTable}&end=${endTable}&size=${printSize}`;

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* ── Single Master QR ── */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} />
          <h2 className="font-extrabold text-[15px]">رمز QR الأساسي (للمنيو العام)</h2>
        </div>
        <label className="block">
          <span className="text-[12.5px] font-bold mb-1 block">الرابط</span>
          <input className="inp" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="block flex-1 min-w-[140px]">
            <span className="text-[12.5px] font-bold mb-1 block">الحجم</span>
            <select className="inp" value={size} onChange={(e) => setSize(Number(e.target.value))}>
              <option value={512}>512px</option>
              <option value={1024}>1024px</option>
              <option value={2048}>2048px</option>
            </select>
          </label>
          <label className="block flex-1 min-w-[140px]">
            <span className="text-[12.5px] font-bold mb-1 block">لون الرمز</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={dark}
                onChange={(e) => setDark(e.target.value)}
                className="w-9 h-9 rounded-lg border bg-transparent cursor-pointer"
                style={{ borderColor: "var(--line)" }}
              />
              <input
                className="inp !w-24 font-mono"
                dir="ltr"
                value={dark}
                onChange={(e) => setDark(e.target.value)}
              />
            </span>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13.5px] font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withLogo}
            onChange={(e) => setWithLogo(e.target.checked)}
            className="w-4 h-4 accent-amber-600"
          />
          لوجو كافيه السعد في المنتصف
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => downloadSingle("png")}
            disabled={busy !== ""}
            className="btn btn-primary btn-sm"
          >
            <Download size={13} /> {busy === "png" ? "…" : "تحميل PNG"}
          </button>
          <button
            onClick={() => downloadSingle("svg")}
            disabled={busy !== ""}
            className="btn btn-ghost btn-sm"
          >
            <Download size={13} /> {busy === "svg" ? "…" : "SVG (فيكتور عالي الدقة)"}
          </button>
        </div>
        <div
          className="rounded-xl border p-4 flex justify-center bg-stone-50"
          style={{ borderColor: "var(--line)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/qr-preview?dark=${encodeURIComponent(dark)}&logo=${withLogo ? 1 : 0}&v=${encodeURIComponent(url)}`}
            alt="QR preview"
            width={160}
            height={160}
            className="rounded-lg shadow-2xs"
          />
        </div>
      </section>

      {/* ── Table Batch QR & Printing ── */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 size={16} />
            <h2 className="font-extrabold text-[15px]">رموز طاولات الصالة (طباعة & ملفات)</h2>
          </div>
          <span className="text-[11.5px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
            ديناميكي بالكامل
          </span>
        </div>

        <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
          كل طاولة يُولد لها رمز مستقل يفتح المنيو مع رقمها الخاص (؟t=X) لتتبع الطلبات وإحصائيات كل طاولة.
        </p>

        {/* Mode selector */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 text-[12.5px] font-bold">
          <button
            type="button"
            onClick={() => setTableMode("range")}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center ${
              tableMode === "range"
                ? "bg-white text-stone-900 shadow-xs font-black"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            نطاق طاولات (1 إلى 100+)
          </button>
          <button
            type="button"
            onClick={() => setTableMode("single")}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center ${
              tableMode === "single"
                ? "bg-white text-stone-900 shadow-xs font-black"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            إعادة طباعة طاولة واحدة
          </button>
        </div>

        {/* Range mode inputs */}
        {tableMode === "range" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[12px] font-bold mb-1 block">من طاولة رقم</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="inp text-center font-black text-[15px]"
                  value={startTable}
                  onChange={(e) => setStartTable(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold mb-1 block">إلى طاولة رقم</span>
                <input
                  type="number"
                  min={startTable}
                  max={200}
                  className="inp text-center font-black text-[15px]"
                  value={endTable}
                  onChange={(e) => setEndTable(Math.max(startTable, Number(e.target.value) || startTable))}
                />
              </label>
            </div>
            {/* Range Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="text-stone-400 font-bold">اختيارات سريعة:</span>
              {[
                { label: "1-10", s: 1, e: 10 },
                { label: "1-20", s: 1, e: 20 },
                { label: "1-50", s: 1, e: 50 },
                { label: "51-100", s: 51, e: 100 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setStartTable(p.s);
                    setEndTable(p.e);
                  }}
                  className="px-2 py-0.5 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 font-extrabold text-stone-700 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block">
              <span className="text-[12px] font-bold mb-1 block">رقم الطاولة المراد إعادة طباعتها</span>
              <input
                type="number"
                min={1}
                max={200}
                className="inp !w-36 text-center font-black text-[16px]"
                value={singleTable}
                onChange={(e) => setSingleTable(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <p className="text-[11.5px] mt-1.5" style={{ color: "var(--ink-faint)" }}>
              ميزة مخصصة: لو كارت أو استيكر طاولة رقم {singleTable} تلَف، اطبعه لوحده فوراً بدون هدر ورق.
            </p>
          </div>
        )}

        {/* Card Size Selector */}
        <div>
          <span className="text-[12px] font-bold mb-1.5 block">مقاس الكارت المطبوع</span>
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <label
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all select-none ${
                printSize === "10"
                  ? "border-amber-500 bg-amber-50/50 font-black text-amber-950"
                  : "border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <input
                type="radio"
                name="card-size"
                value="10"
                checked={printSize === "10"}
                onChange={() => setPrintSize("10")}
                className="w-4 h-4 accent-amber-600"
              />
              <div>
                <div>10×10 سم (افتراضي)</div>
                <div className="text-[10.5px] font-normal text-stone-500">4 كروت في ورقة A4 مع علامات قص</div>
              </div>
            </label>

            <label
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all select-none ${
                printSize === "15"
                  ? "border-amber-500 bg-amber-50/50 font-black text-amber-950"
                  : "border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <input
                type="radio"
                name="card-size"
                value="15"
                checked={printSize === "15"}
                onChange={() => setPrintSize("15")}
                className="w-4 h-4 accent-amber-600"
              />
              <div>
                <div>15×15 سم (كبير)</div>
                <div className="text-[10.5px] font-normal text-stone-500">كارت كبير بارز للستاندات والبار</div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href={printSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>معاينة ورقة الطباعة الجاهزة / PDF</span>
          </a>

          <button
            onClick={downloadBatch}
            disabled={busy !== ""}
            className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>
              {busy === "zip"
                ? "بيجهز الـ ZIP…"
                : tableMode === "single"
                ? `تحميل ZIP (طاولة ${singleTable})`
                : `تحميل ZIP (${endTable - startTable + 1} رمز)`}
            </span>
          </button>
        </div>

        {/* Print Guidance */}
        <div
          className="rounded-xl p-3.5 text-[12px] leading-relaxed border"
          style={{
            background: "color-mix(in srgb, " + accent + " 6%, transparent)",
            borderColor: "color-mix(in srgb, " + accent + " 25%, transparent)",
          }}
        >
          <div className="flex items-center gap-1.5 font-black mb-1 text-stone-900">
            <Layers size={13} className="text-amber-600" />
            <span>إرشادات الطباعة والقص الفندقي</span>
          </div>
          <ul className="list-disc ps-4 space-y-1 text-stone-700">
            <li>مقاس <strong>10×10 سم</strong> هو المقاس القياسي للطاولات: يخرج 4 كروت مربعة متطابقة في كل ورقة A4.</li>
            <li>يحتوي كل كارت على لوجو الكافيه، الكود المخصص، رقم الطاولة بخط بارز، وعلامات قص دقيقة (Cut Guides).</li>
            <li>لحفظ الورقة كـ <strong>PDF</strong>: اضغط &quot;معاينة ورقة الطباعة&quot; ثم &quot;طباعة&quot; واختر &quot;Save as PDF&quot;.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
