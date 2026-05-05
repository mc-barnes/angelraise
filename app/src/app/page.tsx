"use client";

import { useApp } from "@/context/AppContext";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CampaignCategory } from "@/data/types";

export default function HomePage() {
  const { campaigns } = useApp();
  const [activeCategory, setActiveCategory] = useState<"All" | CampaignCategory>("All");

  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalViews = campaigns.reduce((sum, c) => sum + c.totalAdViews, 0);
  const fundedCount = campaigns.filter((c) => c.raisedAmount >= c.goalAmount).length;

  const pct = (c: typeof campaigns[0]) =>
    Math.min((c.raisedAmount / c.goalAmount) * 100, 100);

  // Trending: highest view velocity (views / days since creation)
  const now = Date.now();
  const trending = [...campaigns]
    .filter((c) => c.raisedAmount < c.goalAmount)
    .map((c) => ({
      ...c,
      velocity: c.totalAdViews / Math.max(1, (now - c.createdAt.getTime()) / 86400000),
    }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 5);

  // Filtered list
  const filtered =
    activeCategory === "All"
      ? campaigns
      : campaigns.filter((c) => c.category === activeCategory);

  const categories: ("All" | CampaignCategory)[] = [
    "All", "education", "health", "community", "environment", "animals", "arts", "humanitarian", "religious",
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-[10px] bg-[#FEF3E8] border border-[#F28C28]/20">
          <p className="text-xs font-medium text-[#C96F1A] uppercase tracking-wider">Total Raised</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[#1A1D21] mt-1">
            ${totalRaised.toFixed(0)}
          </p>
        </div>
        <div className="p-4 rounded-[10px] bg-[#EBF3FE] border border-[#2B7DE9]/20">
          <p className="text-xs font-medium text-[#2B7DE9] uppercase tracking-wider">Ad Views</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[#1A1D21] mt-1">
            {totalViews.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-[10px] bg-[#E6F5EB] border border-[#34A853]/20">
          <p className="text-xs font-medium text-[#34A853] uppercase tracking-wider">Fully Funded</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[#1A1D21] mt-1">
            {fundedCount}
          </p>
        </div>
        <div className="p-4 rounded-[10px] bg-[#F8F9FA] border border-[#E8EAED]">
          <p className="text-xs font-medium text-[#8C939E] uppercase tracking-wider">Active</p>
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[#1A1D21] mt-1">
            {campaigns.length - fundedCount}
          </p>
        </div>
      </div>

      {/* Trending: horizontal scroll */}
      <div className="mb-8">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-[#8C939E] mb-3">
          Trending Now
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {trending.map((c) => (
            <Link
              key={c.id}
              href={`/campaign/${c.id}`}
              className="flex-shrink-0 w-64 rounded-[14px] overflow-hidden border border-[#E8EAED] bg-white hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="relative h-32 overflow-hidden">
                <Image src={c.imageUrl} alt={c.title} fill className="object-cover" />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[#F28C28] uppercase">
                  {c.category}
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[#1A1D21] line-clamp-1">
                  {c.title}
                </h4>
                <div className="mt-2 h-1.5 bg-[#F1F3F5] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F28C28]"
                    style={{ width: `${pct(c)}%` }}
                  />
                </div>
                <p className="text-xs text-[#8C939E] mt-1">{Math.round(pct(c))}% funded</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Category tabs + list view */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((cat) => (
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

      {/* Compact list rows */}
      <div className="border border-[#E8EAED] rounded-[14px] overflow-hidden divide-y divide-[#E8EAED]">
        {filtered.map((c) => {
          const funded = c.raisedAmount >= c.goalAmount;
          return (
            <Link
              key={c.id}
              href={`/campaign/${c.id}`}
              className="flex items-center gap-4 p-4 hover:bg-[#F8F9FA] transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-[6px] overflow-hidden flex-shrink-0">
                <Image src={c.imageUrl} alt={c.title} fill className="object-cover" />
              </div>

              {/* Info */}
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

              {/* Progress pill */}
              <div className="flex-shrink-0 flex items-center gap-3 w-40">
                <div className="flex-1 h-2 bg-[#F1F3F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      funded ? "bg-[#34A853]" : pct(c) > 80 ? "bg-[#E8A317]" : "bg-[#F28C28]"
                    }`}
                    style={{ width: `${pct(c)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#5E6572] tabular-nums w-8 text-right">
                  {Math.round(pct(c))}%
                </span>
              </div>

              {/* Amount */}
              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="text-sm font-semibold text-[#1A1D21]">${c.raisedAmount.toFixed(0)}</p>
                <p className="text-xs text-[#8C939E]">of ${c.goalAmount}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
