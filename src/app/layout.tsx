import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Meisi Kanri | Business Card Workspace",
  description: "Capture business cards, extract data with AI, and manage searchable records with sharing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
