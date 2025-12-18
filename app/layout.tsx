import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word to PDF Converter",
  description: "Fast, secure Word to PDF conversion SaaS",
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
