import { requireAdmin } from "@/lib/auth";
import { qrPng } from "@/lib/qr";
import { MENU_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Printable table-QR sheet (admin host only). */
export default async function QrPrintPage() {
  await requireAdmin();
  const COUNT = 10;
  const qr = await qrPng(`${MENU_URL}/?t=1`, { size: 512 });
  const dataUri = `data:image/png;base64,${qr.toString("base64")}`;

  const cells = Array.from({ length: COUNT }, (_, i) => i + 1);

  return (
    <div dir="rtl" className="print:p-0 p-6 max-w-3xl mx-auto">
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', () => setTimeout(() => window.print(), 500));" }} />
      <style>{`
        @media print {
          .qr-grid { display: grid !important; grid-template-columns: repeat(3, 1fr); gap: 14mm 10mm; }
          .qr-cell { break-inside: avoid; text-align: center; }
        }
      `}</style>
      <header className="text-center mb-6 no-print">
        <h1 className="menu-title text-xl">ورقة طباعة رموز التربيزات (1-{COUNT})</h1>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-faint)" }}>
          بتتفتح نافذة الطباعة تلقائياً — كل رمز بيفضل واضح على مقاس 5×5 سم
        </p>
      </header>
      <div className="grid grid-cols-3 gap-8">
        {cells.map((t) => (
          <figure key={t} className="text-center qr-cell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri} alt={`ترابيزة ${t}`} width={180} height={180} className="mx-auto" />
            <figcaption className="font-extrabold mt-1.5 text-[15px]">ترابيزة {t}</figcaption>
            <p className="text-[10px]" style={{ color: "var(--ink-faint)" }} dir="ltr">
              menu.elsa3dcafe.com/?t={t}
            </p>
          </figure>
        ))}
      </div>
    </div>
  );
}
