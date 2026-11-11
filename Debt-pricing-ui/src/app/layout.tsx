import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "قیمت‌گذاری بدهی",
  description: "قیمت‌گذاری خرید و فروش بدهی برای مطالبات وام خودرو",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
