import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "(주)엠티에스 협력사 포털",
  description: "엠티에스 협력사 업무 포털 — 발주·납품·정산 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
