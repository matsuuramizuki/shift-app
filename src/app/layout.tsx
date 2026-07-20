import type { Metadata } from "next";
import "./globals.css";

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
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
