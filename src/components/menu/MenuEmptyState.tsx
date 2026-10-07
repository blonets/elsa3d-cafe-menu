"use client";

import { useEffect } from "react";

export default function MenuEmptyState({ nameAr, nameEn, whatsapp }: { nameAr: string; nameEn: string; whatsapp: string }) {
  return (
    <div className="empty-state">
      <div className="empty-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.png" alt={nameEn} width={120} height={120} className="mx-auto rounded-full" />
        <h1 className="menu-title text-2xl mt-5">
          <span className="txt-ar">{nameAr}</span>
          <span className="txt-en">{nameEn}</span>
        </h1>
        <p className="mt-3 text-[15px] font-semibold" style={{ color: "var(--ink-soft)" }}>
          <span className="txt-ar">
            المينيو بيتحدّث حالياً <span className="pulse-dot">●</span> تابعنا قريب
          </span>
          <span className="txt-en">
            The menu is being updated <span className="pulse-dot">●</span> stay tuned
          </span>
        </p>
        <p className="mt-2 text-[13px]" style={{ color: "var(--ink-faint)" }}>
          <span className="txt-ar">للاستفسار والحجز: كلمنا واتساب</span>
          <span className="txt-en">For inquiries: message us on WhatsApp</span>
        </p>
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary mt-5"
        >
          <span className="txt-ar">تواصل واتساب</span>
          <span className="txt-en">WhatsApp us</span>
        </a>
      </div>
    </div>
  );
}
