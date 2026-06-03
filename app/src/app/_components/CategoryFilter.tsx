"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Campaign, CampaignCategory } from "@/data/types";

const CATEGORIES: ("All" | CampaignCategory)[] = [
  "All",
  "education",
  "health",
  "community",
  "environment",
  "animals",
  "arts",
  "humanitarian",
  "religious",
];

const pct = (c: Campaign): number =>
  c.goalAmount === 0
    ? 0
    : Math.min((c.raisedAmount / c.goalAmount) * 100, 100);

export default function CategoryFilter({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  const [activeCategory, setActiveCategory] = useState<
    "All" | CampaignCategory
  >("All");

  const filtered =
    activeCategory === "All"
      ? campaigns
      : campaigns.filter((c) => c.category === activeCategory);

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === cat
                ? "bg-[#1A1D21] text-white"
                : "bg-[#F1F3F5] text-[#5E6572] hover:bg-[#E8EAED]"
            }`}
          >
            {cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="border border-[#E8EAED] rounded-[14px] overflow-hidden divide-y divide-[#E8EAED]">
        {filtered.map((c) => {
          const funded = c.raisedAmount >= c.goalAmount;
          const percent = pct(c);
          return (
            <Link
              key={c.id}
              href={`/campaign/${c.id}`}
              className="flex items-center gap-4 p-4 hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="relative w-14 h-14 rounded-[6px] overflow-hidden flex-shrink-0">
                <Image
                  src={c.imageUrl}
                  alt={c.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[#1A1D21] truncate">
                    {c.title}
                  </h4>
                  {funded && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-[#E6F5EB] text-[#34A853] text-[10px] font-bold uppercase">
                      Funded
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8C939E]">
                  {c.hostName} &middot; {c.totalAdViews.toLocaleString()} views
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 w-24 sm:w-40">
                <div className="flex-1 h-2 bg-[#F1F3F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      funded
                        ? "bg-[#34A853]"
                        : percent > 80
                        ? "bg-[#E8A317]"
                        : "bg-[#F28C28]"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#5E6572] tabular-nums w-8 text-right">
                  {Math.round(percent)}%
                </span>
              </div>

              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="text-sm font-semibold text-[#1A1D21]">
                  ${c.raisedAmount.toFixed(0)}
                </p>
                <p className="text-xs text-[#8C939E]">of ${c.goalAmount}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
