"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `text-sm font-semibold transition-colors ${
      pathname === path ? "text-[#2B7DE9]" : "text-[#5E6572] hover:text-[#1A1D21]"
    }`;

  return (
    <header className="border-b border-[#E8EAED] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-body)] text-2xl font-light text-[#F28C28] tracking-tight"
        >
          angelraise
        </Link>
        <nav className="flex items-center gap-7">
          <Link href="/" className={linkClass("/")}>
            Browse
          </Link>
          <Link href="/impact" className={linkClass("/impact")}>
            My Impact
          </Link>
          <Link
            href="/create"
            className="text-sm font-bold text-white bg-[#2B7DE9] hover:bg-[#1F6AD4] px-5 py-2 rounded-[10px] transition-colors"
          >
            Create Campaign
          </Link>
        </nav>
      </div>
    </header>
  );
}
