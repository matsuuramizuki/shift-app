import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "シフト管理",
  description: "パン屋さんのための、シンプルで使いやすいシフト管理アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "シフト管理",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${outfit.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

