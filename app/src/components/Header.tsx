"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (path: string) =>
    `text-sm font-semibold transition-colors ${
      pathname === path ? "text-[#2B7DE9]" : "text-[#5E6572] hover:text-[#1A1D21]"
    }`;

  // Mobile links get larger 44px touch targets + a vertical stack.
  const mobileLinkClass = (path: string) =>
    `block px-2 py-3 text-base font-semibold transition-colors ${
      pathname === path ? "text-[#2B7DE9]" : "text-[#5E6572] hover:text-[#1A1D21]"
    }`;

  return (
    <header className="border-b border-[#E8EAED] bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-body)] text-2xl font-light text-[#F28C28] tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          angelraise
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Main navigation"
          className="hidden sm:flex items-center gap-7"
        >
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

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="sm:hidden -mr-2 flex h-11 w-11 items-center justify-center text-[#1A1D21]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Main navigation"
          className="sm:hidden border-t border-[#E8EAED] bg-white px-5 pb-4 pt-2"
        >
          <Link
            href="/"
            className={mobileLinkClass("/")}
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <Link
            href="/impact"
            className={mobileLinkClass("/impact")}
            onClick={() => setMenuOpen(false)}
          >
            My Impact
          </Link>
          <Link
            href="/create"
            className="mt-2 block w-full text-center text-sm font-bold text-white bg-[#2B7DE9] hover:bg-[#1F6AD4] px-5 py-3 rounded-[10px] transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Create Campaign
          </Link>
        </nav>
      )}
    </header>
  );
}
