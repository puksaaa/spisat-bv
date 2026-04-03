import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Onest } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { absoluteUrl } from "@/lib/utils";

import "./globals.css";

const headingFont = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-heading"
});

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: "Обучение от тети Аннушки",
  description:
    "Публичный каталог методичек по программированию: 40 модулей, теория, разбор примеров, PDF/CSV/TXT и комментарии без авторизации.",
  openGraph: {
    title: "Обучение от тети Аннушки",
    description:
      "Публичный каталог методичек по программированию с быстрыми страницами модулей и файловыми вложениями.",
    url: absoluteUrl("/"),
    siteName: "Обучение от тети Аннушки",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630
      }
    ],
    locale: "ru_RU",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Обучение от тети Аннушки",
    description: "40 модулей по программированию, публичные материалы и файлы без авторизации.",
    images: [absoluteUrl("/opengraph-image")]
  }
};

export const viewport: Viewport = {
  themeColor: "#F3F8FF",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <div className="page-background" />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
