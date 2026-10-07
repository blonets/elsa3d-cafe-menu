"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  PlusCircle,
  FileSpreadsheet,
  Palette,
  QrCode,
  History,
  Settings,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/items", label: "الأصناف", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "الأقسام", icon: FolderTree },
  { href: "/admin/addons", label: "الإضافات", icon: PlusCircle },
  { href: "/admin/import", label: "الاستيراد والتصدير", icon: FileSpreadsheet },
  { href: "/admin/appearance", label: "المظهر", icon: Palette },
  { href: "/admin/qr", label: "رموز QR", icon: QrCode },
  { href: "/admin/audit", label: "سجل العمليات", icon: History },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminChrome({ children, menuUrl }: { children: React.ReactNode; menuUrl: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin" || pathname === "/";
    return pathname.startsWith(href);
  };

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="admin-bg flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-s md:border-[var(--line)] bg-[var(--card)] md:min-h-dvh md:sticky md:top-0 md:h-dvh flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" className="w-9 h-9 rounded-full" />
          <div className="leading-tight">
            <p className="font-extrabold text-[14px]">لوحة التحكم</p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              كافيه السعد
            </p>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 px-2.5 pb-2 overflow-x-auto md:overflow-y-auto flex-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`admin-nav-link ${isActive(n.href) ? "active" : ""}`}>
              <n.icon size={17} className="shrink-0" />
              <span className="whitespace-nowrap">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-2.5 py-3 border-t border-[var(--line)] space-y-1">
          <a href={menuUrl} target="_blank" rel="noreferrer" className="admin-nav-link">
            <ExternalLink size={16} />
            <span>عرض المنيو</span>
          </a>
          <button onClick={logout} disabled={loggingOut} className="admin-nav-link w-full !text-red-600">
            <LogOut size={16} />
            <span>{loggingOut ? "…" : "تسجيل الخروج"}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-6">{children}</main>
    </div>
  );
}
