"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Table2, Printer } from "lucide-react";

export default function QrCenter({ menuUrl, accent, primary }: { menuUrl: string; accent: string; primary: string }) {
  const [url, setUrl] = useState(menuUrl);
  const [size, setSize] = useState(1024);
  const [withLogo, setWithLogo] = useState(true);
  const [dark, setDark] = useState(primary);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState("");

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
    const res = await fetch("/api/admin/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "batch", count }),
    });
    if (res.ok) {
      const blob = await res.blob();
      triggerDownload(blob, `table-qr-${count}.zip`);
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

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* Single QR */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} />
          <h2 className="font-extrabold text-[15px]">رمز QR أساسي</h2>
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
              <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="w-9 h-9 rounded-lg border bg-transparent cursor-pointer" style={{ borderColor: "var(--line)" }} />
              <input className="inp !w-24 font-mono" dir="ltr" value={dark} onChange={(e) => setDark(e.target.value)} />
            </span>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13.5px] font-bold cursor-pointer select-none">
          <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} className="w-4 h-4" />
          لوجو كافيه السعد في النص
        </label>
        <div className="flex gap-2">
          <button onClick={() => downloadSingle("png")} disabled={busy !== ""} className="btn btn-primary btn-sm">
            <Download size={13} /> {busy === "png" ? "…" : "PNG"}
          </button>
          <button onClick={() => downloadSingle("svg")} disabled={busy !== ""} className="btn btn-ghost btn-sm">
            <Download size={13} /> {busy === "svg" ? "…" : "SVG (فيكتور)"}
          </button>
        </div>
        <div className="rounded-xl border p-4 flex justify-center" style={{ borderColor: "var(--line)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/qr-preview?dark=${encodeURIComponent(dark)}&logo=${withLogo ? 1 : 0}&v=${encodeURIComponent(url)}`}
            alt="QR preview"
            width={160}
            height={160}
            className="rounded-lg"
          />
        </div>
      </section>

      {/* Table batch */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Table2 size={16} />
          <h2 className="font-extrabold text-[15px]">رموز التربيزات</h2>
        </div>
        <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
          كل تربيزة ليها رمز يفتح المنيو برقمها — عشان تعرف إحصائيات كل تربيزة
        </p>
        <label className="block">
          <span className="text-[12.5px] font-bold mb-1 block">عدد التربيزات (1-100)</span>
          <input
            type="number"
            min={1}
            max={100}
            className="inp !w-32 text-center font-extrabold"
            value={count}
            onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBatch} disabled={busy !== ""} className="btn btn-primary btn-sm">
            <Download size={13} /> {busy === "zip" ? "بيجهز…" : `تحميل ZIP (${count} رمز)`}
          </button>
          <a href="/admin/qr/print" target="_blank" className="btn btn-ghost btn-sm">
            <Printer size={13} /> ورقة طباعة جاهزة
          </a>
        </div>
        <div className="rounded-xl p-4 text-[12.5px] leading-relaxed" style={{ background: "color-mix(in srgb, " + accent + " 8%, transparent)" }}>
          <p className="font-extrabold mb-1">نصيحة طباعة</p>
          <ul className="list-disc ps-4 space-y-0.5" style={{ color: "var(--ink-soft)" }}>
            <li>اطبع بحجم 5×5 سم على الأقل على كل تربيزة</li>
            <li>الـ SVG ينفع للطباعة بأي مقاس بدون تكسير</li>
            <li>جرب تمسح الرمز بالموبايل قبل التوزيع النهائي</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
