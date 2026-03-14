import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word to PDF Converter — Free, Fast & Pixel-Perfect | Verbatim PDF",
  description: "Convert Word documents to PDF instantly. Free online Word to PDF converter — no sign-up, no ads, files never stored. Pixel-perfect output every time.",
  keywords: "word to pdf, word to pdf converter, convert word to pdf, docx to pdf, free word to pdf, online word to pdf converter",
  openGraph: {
    title: "Word to PDF Converter — Free, Fast & Pixel-Perfect",
    description: "Convert Word documents to PDF instantly. No sign-up, no ads, files never stored. Pixel-perfect output every time.",
    url: "https://verbatimpdf.com",
    siteName: "Verbatim PDF",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Word to PDF Converter — Free & Pixel-Perfect | Verbatim PDF",
    description: "Convert Word documents to PDF instantly. No sign-up, no ads, files never stored.",
  },
  alternates: {
    canonical: "https://verbatimpdf.com",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'CkOXIDBalh2FPQHla9eHttv67pq_ep4TgKX0_mw1NgI',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
