import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MENU_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(MENU_URL),
  title: {
    default: "كافيه السعد | Elsa3d Cafe — المينيو",
    template: "%s | Elsa3d Cafe",
  },
  description: "منيو كافيه السعد الإلكتروني — قهوة مختصة، مشروبات، حلويات وشيشة",
  openGraph: {
    title: "كافيه السعد | Elsa3d Cafe",
    description: "منيو كافيه السعد الإلكتروني",
    images: ["/brand/og-image.png"],
    type: "website",
    locale: "ar_EG",
  },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon.ico", sizes: "48x32" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-lang="ar" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
