import type { Metadata } from "next";
import { Nunito_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const nunitoSans = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AngelRaise — Fund Causes by Watching Ads",
  description:
    "Watch ads to raise money for nonprofits. No donations required — your time makes the difference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunitoSans.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-white text-[#1A1D21] font-[family-name:var(--font-body)] antialiased">
        <Header />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
