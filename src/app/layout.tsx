import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom Readme — Dynamic Image API",
  description:
    "GitHub Profile README用の画像を動的に生成するAPI。アニメーション付きSVGにも対応。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="ambient-bg" />
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
