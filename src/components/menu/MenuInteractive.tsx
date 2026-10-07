"use client";

import { useEffect, useRef } from "react";

export type TabInfo = { slug: string; nameAr: string; nameEn: string; icon: string | null };

type Props = {
  oosMode: string;
  announcementHash: string;
};

/**
 * All menu interactivity via direct DOM (keeps the page fully static):
 * search, category tabs + scroll-spy, quick chips, language + dark toggles,
 * announcement dismissal, availability polling, analytics beacons.
 */
export default function MenuInteractive({ oosMode, announcementHash }: Props) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const disposers: (() => void)[] = [];
    const on = (el: Element | null | undefined, ev: string, fn: EventListener) => {
      if (!el) return;
      el.addEventListener(ev, fn);
      disposers.push(() => el.removeEventListener(ev, fn));
    };

    /* ── Language toggle ── */
    const langBtn = document.getElementById("lang-toggle");
    const syncLangBtn = () => {
      if (!langBtn) return;
      const cur = html.dataset.lang === "en" ? "EN" : "ع";
      langBtn.textContent = html.dataset.lang === "en" ? "ع" : "EN";
      void cur;
    };
    syncLangBtn();
    on(langBtn, "click", () => {
      const next = html.dataset.lang === "ar" ? "en" : "ar";
      html.dataset.lang = next;
      html.lang = next;
      html.dir = next === "en" ? "ltr" : "rtl";
      try {
        localStorage.setItem("elsa3d-lang", next);
      } catch {}
      syncLangBtn();
    });

    /* ── Dark mode toggle ── */
    const modeBtn = document.getElementById("mode-toggle");
    const syncModeBtn = () => {
      if (modeBtn) modeBtn.textContent = html.classList.contains("dark") ? "☀️" : "🌙";
    };
    syncModeBtn();
    on(modeBtn, "click", () => {
      const dark = html.classList.toggle("dark");
      try {
        localStorage.setItem("elsa3d-mode", dark ? "dark" : "light");
      } catch {}
      syncModeBtn();
    });

    /* ── Announcement dismissal ── */
    const ann = document.getElementById("announcement");
    if (ann && ann.dataset.annHash) {
      let dismissed: string | null = null;
      try {
        dismissed = sessionStorage.getItem(`elsa3d-ann-${announcementHash}`);
      } catch {}
      if (dismissed === announcementHash) {
        ann.remove();
      } else {
        on(document.getElementById("ann-dismiss"), "click", () => {
          ann.remove();
          try {
            sessionStorage.setItem(`elsa3d-ann-${announcementHash}`, announcementHash);
          } catch {}
        });
      }
    }

    /* ── Unified row visibility: search × availability × OOS mode ── */
    const search = document.getElementById("menu-search") as HTMLInputElement | null;
    const noResults = document.getElementById("no-results");
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-item-code]"));
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-cat-slug]"));
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSentTerm = "";
    let unavailableItems = new Set<number>();
    let unavailableVariants = new Set<number>();
    let currentOosMode = oosMode;

    const syncRow = (row: HTMLElement) => {
      if (row.dataset.searchHidden === undefined) row.dataset.searchHidden = "0";
      const id = Number(row.dataset.itemId);
      const unavailable = unavailableItems.has(id);
      row.dataset.available = unavailable ? "0" : "1";
      const searchHidden = row.dataset.searchHidden === "1";
      if (unavailable && currentOosMode === "hide") {
        row.style.display = "none";
      } else {
        row.style.display = searchHidden ? "none" : "";
        row.classList.toggle("oos-gray", unavailable && currentOosMode === "gray");
      }
    };
    const syncAll = () => {
      for (const row of rows) syncRow(row);
      for (const sec of sections) {
        const visible = sec.querySelectorAll('[data-item-code][data-search-hidden="0"]').length;
        sec.style.display = visible === 0 ? "none" : "";
      }
      const best = document.getElementById("bestsellers");
      if (best) {
        if (best.dataset.searchHidden === undefined) best.dataset.searchHidden = "0";
        best.style.display = best.dataset.searchHidden === "1" ? "none" : "";
      }
      const anyVisible = sections.some((s) => s.style.display !== "none");
      const q = search?.value.trim() ?? "";
      if (noResults) noResults.classList.toggle("hidden", anyVisible || !q);
      document.querySelectorAll<HTMLElement>("[data-variant-id]").forEach((el) => {
        const id = Number(el.dataset.variantId);
        const off = unavailableVariants.has(id);
        el.style.opacity = off ? "0.4" : "";
        el.style.textDecoration = off ? "line-through" : "";
      });
    };

    const applySearch = () => {
      if (!search) return;
      const q = search.value.trim().toLowerCase();
      const best = document.getElementById("bestsellers");
      if (best) best.dataset.searchHidden = q ? "1" : "0";
      for (const row of rows) {
        const hay = row.dataset.hay ?? (row.dataset.hay = row.textContent?.toLowerCase() ?? "");
        row.dataset.searchHidden = !q || hay.includes(q) ? "0" : "1";
      }
      syncAll();
      // fire-and-forget search analytics
      if (q.length >= 2 && q !== lastSentTerm) {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          lastSentTerm = q;
          beacon({ type: "search", term: q });
        }, 900);
      }
    };
    on(search, "input", applySearch);

    /* ── Category tabs + quick chips: click → smooth scroll ── */
    const tabButtons = document.querySelectorAll<HTMLElement>(".cat-tab, #quick-chips .chip");
    const setActiveTab = (slug: string) => {
      tabButtons.forEach((b) => {
        if (b.classList.contains("cat-tab")) b.classList.toggle("active", b.dataset.slug === slug);
      });
    };
    tabButtons.forEach((btn) => {
      on(btn, "click", () => {
        const target = btn.dataset.target ?? "top";
        const el = target === "top" ? document.getElementById("menu-main") : document.getElementById(target);
        if (!el) return;
        setActiveTab(btn.dataset.slug ?? "__top");
        const y = el.getBoundingClientRect().top + window.scrollY - (target === "top" ? 140 : 120);
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });

    /* scroll-spy */
    let spyTick = false;
    const spy = () => {
      if (spyTick) return;
      spyTick = true;
      requestAnimationFrame(() => {
        spyTick = false;
        const line = window.innerHeight * 0.35;
        let current = "__top";
        for (const sec of sections) {
          if (sec.getBoundingClientRect().top <= line) current = sec.dataset.catSlug ?? "__top";
        }
        if (window.scrollY < 150) current = "__top";
        setActiveTab(current);
        const activeTab = document.querySelector<HTMLElement>(`.cat-tab.active`);
        if (activeTab) activeTab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      });
    };
    window.addEventListener("scroll", spy, { passive: true });
    disposers.push(() => window.removeEventListener("scroll", spy));

    /* ── Availability polling (30s, tiny JSON, no page rebuild) ── */
    const applyAvailability = (data: { items: number[]; variants: number[]; oosMode: string }) => {
      unavailableItems = new Set(data.items);
      unavailableVariants = new Set(data.variants);
      currentOosMode = data.oosMode || oosMode;
      syncAll();
    };
    let pollAbort: AbortController | null = null;
    const poll = async () => {
      try {
        pollAbort?.abort();
        pollAbort = new AbortController();
        const res = await fetch("/api/availability", { signal: pollAbort.signal, cache: "no-store" });
        if (res.ok) applyAvailability(await res.json());
      } catch {}
    };
    poll();
    const pollTimer = setInterval(poll, 30_000);
    disposers.push(() => {
      clearInterval(pollTimer);
      pollAbort?.abort();
    });

    /* ── Analytics: scan + item_view ── */
    const tableNo = new URLSearchParams(window.location.search).get("t");
    const scanKey = `elsa3d-scan-${new Date().toDateString()}`;
    let scanned = false;
    try {
      scanned = sessionStorage.getItem(scanKey) === "1";
    } catch {}
    if (!scanned) {
      beacon({ type: "scan", tableNo: tableNo ? Number(tableNo) : undefined });
      try {
        sessionStorage.setItem(scanKey, "1");
      } catch {}
    }

    const seenViews = new Set<string>();
    try {
      (JSON.parse(sessionStorage.getItem("elsa3d-views") ?? "[]") as string[]).forEach((k) => seenViews.add(k));
    } catch {}
    const viewObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const code = el.dataset.itemCode;
          const id = el.dataset.itemId;
          const key = `${code}`;
          if (!code || seenViews.has(key)) continue;
          seenViews.add(key);
          viewObserver.unobserve(el);
          beacon({ type: "item_view", itemId: id ? Number(id) : undefined });
        }
        try {
          sessionStorage.setItem("elsa3d-views", JSON.stringify([...seenViews].slice(-200)));
        } catch {}
      },
      { threshold: 0.6 },
    );
    rows.forEach((r) => viewObserver.observe(r));
    disposers.push(() => viewObserver.disconnect());

    /* ── Placeholder localization for search ── */
    const syncPlaceholder = () => {
      if (!search) return;
      search.placeholder =
        html.dataset.lang === "en"
          ? search.dataset.placeholderEn ?? "Search the menu…"
          : search.dataset.placeholderAr ?? "ابحث في المنيو…";
    };
    syncPlaceholder();
    on(langBtn, "click", syncPlaceholder);

    cleanupRef.current = () => disposers.forEach((d) => d());
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [oosMode, announcementHash]);

  return null;
}

function beacon(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/analytics", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {}
}
