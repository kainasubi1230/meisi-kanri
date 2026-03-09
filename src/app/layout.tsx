import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "名刺電子化アプリ",
  description: "名刺画像をAIで抽出して、認証付きで管理するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
