import type { Metadata } from "next";
import Image from "next/image";
import { getMenuData, hasAnyContent } from "@/lib/menu-data";
import { fmtPricePlain } from "@/lib/format";
import { BADGE_LABELS_AR, type Badge } from "@/lib/badges";
import { getIcon } from "@/lib/icons";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "نسخة الطباعة",
  robots: { index: false },
};

export default async function PrintMenuPage() {
  const data = await getMenuData();
  const s = data.settings;
  const empty = !hasAnyContent(data);

  return (
    <div
      className="mx-auto max-w-[760px] px-8 py-8 print:p-0"
      style={{ "--brand-accent": s.accentColor } as React.CSSProperties}
      dir="rtl"
    >
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('load', () => setTimeout(() => window.print(), 400));" }} />

      <header className="text-center mb-8">
        <Image src="/brand/logo-mark.png" alt={s.cafeNameEn} width={96} height={96} className="mx-auto rounded-full" />
        <h1 className="menu-title text-3xl mt-3">{s.cafeNameAr}</h1>
        <p className="text-lg font-bold" style={{ color: s.accentColor }} dir="ltr">
          {s.cafeNameEn}
        </p>
        {s.workingHours && <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{s.workingHours}</p>}
      </header>

      {empty ? (
        <p className="text-center text-sm py-20" style={{ color: "var(--ink-faint)" }}>
          المينيو بيتحدّث حالياً…
        </p>
      ) : (
        data.categories.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <section key={cat.slug} className="print-section mb-7">
              <h2 className="print-title flex items-center gap-2">
                {Icon && <Icon size={18} />}
                {cat.nameAr}
                <span className="text-sm font-bold" dir="ltr" style={{ color: "var(--ink-faint)" }}>
                  {cat.nameEn}
                </span>
              </h2>
              <div className="print-grid">
                {cat.items.map((item) => (
                  <div key={item.id} className="print-item py-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-extrabold text-[14.5px]">{item.nameAr}</span>
                      {item.badges.includes("bestseller") && (
                        <span className="text-[10px] font-bold" style={{ color: s.accentColor }}>
                          {BADGE_LABELS_AR.bestseller}
                        </span>
                      )}
                      <span className="leader" aria-hidden />
                      {item.variants.length > 0 && (
                        <span className="font-bold text-[13.5px]" style={{ color: s.accentColor }}>
                          {item.variants.length === 1
                            ? `${fmtPricePlain(item.variants[0].price)}`
                            : item.variants
                                .filter((v) => v.price !== null)
                                .map((v) => `${v.nameAr ? v.nameAr + " " : ""}${fmtPricePlain(v.price)}`)
                                .join(" / ")}
                        </span>
                      )}
                    </div>
                    {item.descAr && <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>{item.descAr}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      <footer className="text-center text-[11px] pt-6 mt-6 border-t" style={{ color: "var(--ink-faint)", borderColor: "var(--line)" }}>
        {s.phone} · wa.me/{s.whatsapp}
      </footer>
    </div>
  );
}
