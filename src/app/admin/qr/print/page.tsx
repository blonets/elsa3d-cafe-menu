import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { qrPng } from "@/lib/qr";
import { MENU_URL } from "@/lib/env";
import { ArrowRight, Scissors, Info } from "lucide-react";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface PageProps {
  searchParams: Promise<{
    start?: string;
    end?: string;
    count?: string;
    table?: string;
    size?: string;
  }>;
}

export default async function QrPrintPage({ searchParams }: PageProps) {
  await requireAdmin();
  const s = await getSettings();
  const sp = await searchParams;

  // Determine tables to print
  let tables: number[] = [];
  let isSingleMode = false;

  if (sp.table) {
    const single = Math.max(1, parseInt(sp.table, 10) || 1);
    tables = [single];
    isSingleMode = true;
  } else if (sp.start || sp.end) {
    const start = Math.max(1, parseInt(sp.start || "1", 10) || 1);
    const end = Math.max(start, parseInt(sp.end || "10", 10) || 10);
    const length = Math.min(end - start + 1, 200);
    tables = Array.from({ length }, (_, i) => start + i);
  } else if (sp.count) {
    const count = Math.max(1, Math.min(parseInt(sp.count, 10) || 10, 200));
    tables = Array.from({ length: count }, (_, i) => i + 1);
  } else {
    tables = Array.from({ length: 10 }, (_, i) => i + 1);
  }

  // Card Size: 10x10 cm (default) vs 15x15 cm
  const cardSize = sp.size === "15" ? "15" : "10";
  const is15cm = cardSize === "15";

  // Generate UNIQUE QR for each individual table in parallel
  const cards = await Promise.all(
    tables.map(async (tableNum) => {
      const tableUrl = `${MENU_URL}/?t=${tableNum}`;
      const pngBuf = await qrPng(tableUrl, {
        size: is15cm ? 768 : 512,
        withLogo: true,
        dark: s.primaryColor || "#1c1917",
      });
      return {
        table: tableNum,
        url: tableUrl,
        dataUri: `data:image/png;base64,${pngBuf.toString("base64")}`,
      };
    })
  );

  // Group cards into A4 pages:
  // 10x10 cm: 4 cards per page (2x2 grid)
  // 15x15 cm: 1 card per page (centered)
  const cardsPerPage = is15cm ? 1 : 4;
  const pages = chunkArray(cards, cardsPerPage);

  // Query string builders for toggling size
  const buildQuery = (newSize: string) => {
    const params = new URLSearchParams();
    if (sp.table) params.set("table", sp.table);
    if (sp.start) params.set("start", sp.start);
    if (sp.end) params.set("end", sp.end);
    if (sp.count && !sp.start && !sp.end && !sp.table) params.set("count", sp.count);
    params.set("size", newSize);
    return `?${params.toString()}`;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-stone-100 print:bg-white text-stone-900">
      {/* ── Print Stylesheet ── */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 5mm;
        }

        @media screen {
          .a4-sheet {
            width: 210mm;
            min-height: 297mm;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            margin: 0 auto 24px auto;
            box-sizing: border-box;
            border-radius: 4px;
          }
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-sheet {
            width: 200mm !important;
            min-height: 287mm !important;
            max-height: 287mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            border-radius: 0 !important;
          }
          .a4-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }

        /* 10x10 cm card rules */
        .card-10cm {
          width: 100mm;
          height: 100mm;
          max-width: 100mm;
          max-height: 100mm;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          position: relative;
        }

        /* 15x15 cm card rules */
        .card-15cm {
          width: 150mm;
          height: 150mm;
          max-width: 150mm;
          max-height: 150mm;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          position: relative;
        }
      `}</style>

      {/* ── Interactive Toolbar (Screen only - Hidden in Print) ── */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/qr"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-stone-600 hover:text-stone-900 transition-colors"
            >
              <ArrowRight size={16} />
              <span>مركز QR</span>
            </Link>
            <div className="h-4 w-px bg-stone-300" />
            <div>
              <h1 className="text-[15px] font-black leading-tight text-stone-900">
                معاينة طباعة كروت الطاولات
              </h1>
              <p className="text-[12px] text-stone-500">
                {isSingleMode
                  ? `طاولة رقم ${tables[0]} (كارت واحد)`
                  : `طاولات من ${tables[0]} إلى ${tables[tables.length - 1]} (${tables.length} كارت) — ${pages.length} ورقة A4`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Size Selector */}
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-[12px] font-bold">
              <Link
                href={buildQuery("10")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  !is15cm
                    ? "bg-white text-stone-900 shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                10×10 سم (افتراضي 4 بالورقة)
              </Link>
              <Link
                href={buildQuery("15")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  is15cm
                    ? "bg-white text-stone-900 shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                15×15 سم (كبير)
              </Link>
            </div>

            {/* Print Trigger Button */}
            <PrintButton />
          </div>
        </div>

        {/* Tip banner */}
        <div className="max-w-5xl mx-auto mt-2 flex items-center gap-2 text-[11.5px] text-stone-600 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-1.5">
          <Info size={14} className="text-amber-600 shrink-0" />
          <span>
            <strong>نصيحة:</strong> لحفظ الكروت كملف PDF عالي الجودة للطباعة في أي وقت، اضغط &quot;طباعة الآن&quot; ثم اختر من نافذة المتصفح: <strong>الوجهة (Destination) ← حفظ بتنسيق PDF</strong>.
          </span>
        </div>
      </header>

      {/* ── Printable Sheets Container ── */}
      <main className="py-6 print:py-0">
        {pages.map((pageCards, pageIdx) => (
          <section
            key={pageIdx}
            className={`a4-sheet ${
              is15cm
                ? "flex items-center justify-center p-6 print:p-0"
                : "grid grid-cols-2 grid-rows-2 justify-center content-center gap-0 p-[5mm] print:p-0"
            }`}
          >
            {pageCards.map((c) => (
              <article
                key={c.table}
                className={`${
                  is15cm ? "card-15cm" : "card-10cm"
                } border-1.5 border-dashed border-stone-400 bg-white flex flex-col items-center justify-between p-3.5 print:p-3 relative overflow-hidden`}
              >
                {/* ── Cut guide indicators ── */}
                <div
                  className="absolute top-1 start-1.5 text-[8px] text-stone-400 font-mono select-none flex items-center gap-0.5 pointer-events-none opacity-80"
                  aria-hidden="true"
                >
                  <Scissors size={9} />
                  <span>قص</span>
                </div>
                <div
                  className="absolute bottom-1 end-1.5 text-[8px] text-stone-400 font-mono select-none pointer-events-none opacity-80"
                  aria-hidden="true"
                >
                  {is15cm ? "15×15 cm" : "10×10 cm"}
                </div>

                {/* ── Card Header: Logo + Cafe Name ── */}
                <header className="w-full text-center pt-0.5">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/logo-mark.png"
                      alt="Logo"
                      width={is15cm ? 26 : 20}
                      height={is15cm ? 26 : 20}
                      className="rounded-full inline-block"
                    />
                    <span className={`font-black tracking-tight text-stone-900 ${is15cm ? "text-[15px]" : "text-[12.5px]"}`}>
                      {s.cafeNameAr || "كافيه السعد"}
                    </span>
                  </div>
                  <div className={`font-extrabold tracking-widest text-stone-500 uppercase ${is15cm ? "text-[9px]" : "text-[7.5px]"}`}>
                    {s.cafeNameEn || "Elsa3d Cafe"}
                  </div>
                </header>

                {/* ── Card Center: High-Res Table-Specific QR ── */}
                <div className="my-auto py-1 flex items-center justify-center">
                  <div className="p-1 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.dataUri}
                      alt={`QR طاولة ${c.table}`}
                      width={is15cm ? 240 : 160}
                      height={is15cm ? 240 : 160}
                      className="block object-contain"
                    />
                  </div>
                </div>

                {/* ── Card Bottom: Huge Table Number & Guidance ── */}
                <footer className="w-full text-center pb-0.5 space-y-0.5">
                  <div className="bg-stone-100/90 border border-stone-200 rounded-lg py-1 px-2 mx-auto inline-block min-w-[110px]">
                    <div className={`font-black text-stone-950 leading-none ${is15cm ? "text-[24px]" : "text-[18px]"}`}>
                      طاولة {c.table}
                    </div>
                    <div className={`font-extrabold tracking-widest text-stone-600 uppercase mt-0.5 leading-none ${is15cm ? "text-[10px]" : "text-[8.5px]"}`}>
                      TABLE {c.table}
                    </div>
                  </div>

                  <p className={`font-bold text-stone-700 leading-tight pt-1 ${is15cm ? "text-[10.5px]" : "text-[8.5px]"}`}>
                    امسح الرمز بكاميرا الهاتف لتصفح المنيو
                  </p>
                  <p className="text-[7px] font-mono text-stone-400 leading-none" dir="ltr">
                    menu.elsa3dcafe.com/?t={c.table}
                  </p>
                </footer>
              </article>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
