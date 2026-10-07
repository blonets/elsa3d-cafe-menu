import type { Metadata } from "next";
import Image from "next/image";
import { Phone, MessageCircle, Printer, Clock } from "lucide-react";
import { getMenuData, hasAnyContent } from "@/lib/menu-data";
import { isAnnouncementLive } from "@/lib/settings";
import { MENU_URL } from "@/lib/env";
import { fmtPricePlain } from "@/lib/format";
import { BADGE_LABELS_AR, BADGE_LABELS_EN, type Badge } from "@/lib/badges";
import { getIcon } from "@/lib/icons";
import MenuInteractive, { type TabInfo } from "@/components/menu/MenuInteractive";
import MenuEmptyState from "@/components/menu/MenuEmptyState";

export const dynamic = "force-static";
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: MENU_URL },
};

export default async function MenuPage() {
  const data = await getMenuData();
  const s = data.settings;
  const empty = !hasAnyContent(data);
  const annLive = isAnnouncementLive(s);
  const annHash = hashStr(s.announcement ?? "");

  const tabs: TabInfo[] = data.categories.map((c) => ({
    slug: c.slug,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    icon: c.icon,
  }));

  return (
    <div
      className="menu-shell"
      style={
        {
          "--brand-primary": s.primaryColor,
          "--brand-accent": s.accentColor,
        } as React.CSSProperties
      }
      data-font={s.fontChoice}
    >
      {/* Pre-paint theme/lang boot (runs before first paint, no flicker) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => {
            try {
              const cfg = ${JSON.stringify({ defaultMode: s.defaultMode })};
              const saved = localStorage.getItem("elsa3d-lang");
              if (saved === "en" || saved === "ar") {
                document.documentElement.dataset.lang = saved;
                document.documentElement.lang = saved;
                document.documentElement.dir = saved === "en" ? "ltr" : "rtl";
              }
              const mode = localStorage.getItem("elsa3d-mode") || cfg.defaultMode || "auto";
              const hour = new Date().getHours();
              const dark = mode === "dark" || (mode === "auto" && (hour >= 18 || hour < 6));
              if (dark) document.documentElement.classList.add("dark");
            } catch (e) {}
          })();`,
        }}
      />

      {annLive && (
        <div id="announcement" className="announcement-bar no-print" data-ann-hash={annHash}>
          <div className="mx-auto max-w-[680px] flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-[13px] font-bold leading-snug">
              <span className="txt-ar">{s.announcement}</span>
              <span className="txt-en" dir="ltr">{s.announcement}</span>
            </p>
            <button id="ann-dismiss" aria-label="إغلاق" className="opacity-60 hover:opacity-100 text-lg leading-none px-1">
              ×
            </button>
          </div>
        </div>
      )}

      <header className="menu-header no-print">
        <div className="mx-auto max-w-[680px] px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/brand/logo-mark.png"
                alt="Elsa3d Cafe"
                width={48}
                height={48}
                priority
                className="rounded-full shrink-0"
              />
              <div className="min-w-0">
                <h1 className="menu-title text-[17px] leading-tight truncate">
                  <span className="txt-ar">{s.cafeNameAr}</span>
                  <span className="txt-en">{s.cafeNameEn}</span>
                </h1>
                <p className="text-[11.5px] font-semibold" style={{ color: "var(--brand-accent)" }}>
                  <span className="txt-ar">مينيو إلكتروني</span>
                  <span className="txt-en">Digital Menu</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button id="lang-toggle" className="icon-btn" aria-label="تبديل اللغة" title="AR / EN">
                <span className="text-[12px] font-extrabold">EN</span>
              </button>
              <button id="mode-toggle" className="icon-btn" aria-label="الوضع الليلي" title="Dark / Light">
                <span className="text-[15px]">🌙</span>
              </button>
              <a href={`tel:${s.phone}`} className="icon-btn" aria-label="اتصال">
                <Phone size={16} />
              </a>
              <a
                href={`https://wa.me/${s.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                aria-label="واتساب"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          <div className="mt-3">
            <input
              id="menu-search"
              type="search"
              className="menu-search"
              placeholder="ابحث في المنيو…"
              data-placeholder-ar="ابحث في المنيو…"
              data-placeholder-en="Search the menu…"
              autoComplete="off"
            />
          </div>
        </div>
      </header>

      <nav className="cat-tabs no-print" aria-label="أقسام المنيو">
        <div id="cat-tabs-inner" className="mx-auto max-w-[680px] flex gap-2 overflow-x-auto px-4 py-2.5">
          <button className="cat-tab active" data-target="top" data-slug="__top">
            <span className="txt-ar">الكل</span>
            <span className="txt-en">All</span>
          </button>
          {tabs.map((t) => {
            const Icon = getIcon(t.icon);
            return (
              <button key={t.slug} className="cat-tab" data-target={`sec-${t.slug}`} data-slug={t.slug}>
                {Icon && <Icon size={14} />}
                <span className="txt-ar">{t.nameAr}</span>
                <span className="txt-en">{t.nameEn}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main id="menu-main" className="mx-auto max-w-[680px] px-4 pb-16">
        {empty ? (
          <MenuEmptyState nameAr={s.cafeNameAr} nameEn={s.cafeNameEn} whatsapp={s.whatsapp} />
        ) : (
          <>
            {/* Quick filter chips */}
            <div id="quick-chips" className="flex gap-2 flex-wrap pt-4 no-print">
              {tabs.slice(0, 6).map((t) => (
                <button key={t.slug} className="chip chip-accent" data-target={`sec-${t.slug}`}>
                  <span className="txt-ar">{t.nameAr}</span>
                  <span className="txt-en">{t.nameEn}</span>
                </button>
              ))}
            </div>

            {/* Bestsellers */}
            {data.bestsellers.length > 0 && (
              <section id="bestsellers" className="bestseller-box mt-5 px-5 py-4 print-section">
                <h2 className="section-title !text-[17px]">
                  <span className="sec-icon">★</span>
                  <span className="txt-ar">الأكثر طلباً</span>
                  <span className="txt-en">Most Ordered</span>
                </h2>
                <div className="mt-2">
                  {data.bestsellers.slice(0, 6).map((it) => (
                    <div key={`best-${it.id}`} className="flex items-baseline justify-between gap-3 py-1.5" data-item-id={it.id}>
                      <span className="font-bold text-[14.5px]">
                        <span className="txt-ar">{it.nameAr}</span>
                        <span className="txt-en">{it.nameEn}</span>
                      </span>
                      <span className="text-[13.5px] font-bold" style={{ color: "var(--brand-accent)" }}>
                        {firstPrice(it)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Category sections */}
            {data.categories.map((cat) => {
              const Icon = getIcon(cat.icon);
              return (
                <section key={cat.slug} id={`sec-${cat.slug}`} data-cat-slug={cat.slug} className="pt-7 print-section">
                  <h2 className="section-title">
                    {Icon && <Icon size={20} className="sec-icon" />}
                    <span className="txt-ar">{cat.nameAr}</span>
                    <span className="txt-en">{cat.nameEn}</span>
                  </h2>
                  <div className={`mt-1 ${cat.viewStyle === "compact_list" ? "compact" : ""}`}>
                    {cat.items.map((item) => (
                      <article
                        key={item.id}
                        className="item-row print-item border-b"
                        style={{ borderColor: "var(--line)" }}
                        data-item-id={item.id}
                        data-item-code={item.code}
                        data-available={item.isAvailable ? "1" : "0"}
                      >
                        <div className="item-head">
                          <span className="item-name">
                            <span className="txt-ar">{item.nameAr}</span>
                            <span className="txt-en">{item.nameEn}</span>{" "}
                            {item.badges.map((b) => (
                              <sup key={b} className={`badge badge-${b} no-print`}>
                                <span className="txt-ar">{BADGE_LABELS_AR[b as Badge] ?? b}</span>
                                <span className="txt-en">{BADGE_LABELS_EN[b as Badge] ?? b}</span>
                              </sup>
                            ))}
                            {s.peakMode && item.prepNote && (
                              <span className="badge no-print" style={{ background: "color-mix(in srgb, var(--brand-accent) 14%, transparent)", color: "var(--brand-accent)" }}>
                                <Clock size={10} className="me-1" />
                                <span className="txt-ar">{item.prepNote}</span>
                                <span className="txt-en">{item.prepNote}</span>
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="oos-tag no-print">
                                <span className="txt-ar">خلصان</span>
                                <span className="txt-en">Sold out</span>
                              </span>
                            )}
                          </span>
                          <span className="leader" aria-hidden />
                          {singleVariant(item) && (
                            <span className="item-price" data-variant-id={singleVariant(item)!.id}>
                              {fmtPricePlain(singleVariant(item)!.price)} <span className="txt-ar">{s.currencyLabel}</span>
                            </span>
                          )}
                        </div>

                        {(item.descAr || item.descEn) && (
                          <p className="item-desc">
                            <span className="txt-ar">{item.descAr}</span>
                            <span className="txt-en">{item.descEn}</span>
                          </p>
                        )}

                        {!singleVariant(item) && item.variants.length > 0 && (
                          <div className="variant-prices">
                            {item.variants.map((v) => (
                              <span key={v.id} data-variant-id={v.id}>
                                {v.nameAr || v.nameEn ? (
                                  <>
                                    <span className="vp-name">
                                      <span className="txt-ar">{v.nameAr ?? v.nameEn}</span>
                                      <span className="txt-en">{v.nameEn ?? v.nameAr}</span>
                                    </span>{" "}
                                    <span className="vp-price">{fmtPricePlain(v.price)}</span>
                                  </>
                                ) : (
                                  <span className="vp-price">{fmtPricePlain(v.price)}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.variants.length === 0 && (
                          <div className="variant-prices">
                            <span className="vp-price">—</span>
                          </div>
                        )}

                        {item.addonGroups.length > 0 && (
                          <details className="addon-disclosure mt-2 no-print">
                            <summary>
                              <span className="chev">▸</span>{" "}
                              <span className="txt-ar">الإضافات +</span>
                              <span className="txt-en">Add-ons +</span>
                            </summary>
                            <div className="mt-1.5 ps-3">
                              {item.addonGroups.map((g) => (
                                <div key={g.id} className="mb-1.5">
                                  <p className="text-[12px] font-extrabold" style={{ color: "var(--ink-faint)" }}>
                                    <span className="txt-ar">{g.nameAr}</span>
                                    <span className="txt-en">{g.nameEn}</span>
                                  </p>
                                  {g.addons.map((a) => (
                                    <div key={a.id} className="addon-line">
                                      <span>
                                        <span className="txt-ar">{a.nameAr}</span>
                                        <span className="txt-en">{a.nameEn}</span>
                                      </span>
                                      <span className="leader" aria-hidden />
                                      <span className="ad-price">+{fmtPricePlain(a.priceDelta)}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>

      {!empty && (
        <footer className="menu-footer no-print">
          <div className="mx-auto max-w-[680px] px-4 py-8 text-center space-y-3">
            {(s.footerNoteAr || s.footerNoteEn) && (
              <p className="text-[13px]">
                <span className="txt-ar">{s.footerNoteAr}</span>
                <span className="txt-en">{s.footerNoteEn}</span>
              </p>
            )}
            {s.workingHours && (
              <p className="text-[13px] flex items-center justify-center gap-2">
                <Clock size={14} />
                <span className="txt-ar">{s.workingHours}</span>
                <span className="txt-en">{s.workingHours}</span>
              </p>
            )}
            <div className="flex items-center justify-center gap-3 pt-1">
              <a href={`tel:${s.phone}`} className="btn btn-ghost btn-sm">
                <Phone size={14} />
                <span dir="ltr">{s.phone}</span>
              </a>
              <a
                href={`https://wa.me/${s.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                <MessageCircle size={14} />
                <span className="txt-ar">اطلب واتساب</span>
                <span className="txt-en">WhatsApp order</span>
              </a>
              <a href="/print" className="btn btn-ghost btn-sm" data-no-instant>
                <Printer size={14} />
                <span className="txt-ar">نسخة للطباعة</span>
                <span className="txt-en">Print</span>
              </a>
            </div>
            <p className="text-[11px] pt-2" style={{ color: "var(--ink-faint)" }}>
              © {new Date().getFullYear()}{" "}
              <span className="txt-ar">{s.cafeNameAr}</span>
              <span className="txt-en">{s.cafeNameEn}</span>
            </p>
          </div>
        </footer>
      )}

      <div id="no-results" className="no-results hidden no-print">
        <span className="txt-ar">مفيش نتائج مطابقة… جرب كلمة تانية</span>
        <span className="txt-en">No matching items… try another word</span>
      </div>

      <MenuInteractive oosMode={s.oosDisplayMode} announcementHash={annLive ? annHash : ""} />
    </div>
  );
}

function singleVariant(item: { variants: { id: number; nameAr: string | null; nameEn: string | null; price: string | null; isAvailable: boolean }[] }) {
  if (item.variants.length !== 1) return null;
  return item.variants[0];
}

function firstPrice(item: { variants: { price: string | null }[] }): string {
  const p = item.variants.find((v) => v.price !== null)?.price;
  return p === undefined ? "—" : fmtPricePlain(p);
}

function hashStr(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h));
}
