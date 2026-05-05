"use client";

import { useApp } from "@/context/AppContext";
import Link from "next/link";
import Image from "next/image";

export default function MyImpactPage() {
  const { adViews, campaigns } = useApp();

  const totalRaised = adViews.reduce((sum, v) => sum + v.amountCredited, 0);
  const totalAds = adViews.length;

  // Group views by campaign
  const byCampaign = adViews.reduce<Record<string, { count: number; amount: number }>>((acc, v) => {
    if (!acc[v.campaignId]) acc[v.campaignId] = { count: 0, amount: 0 };
    acc[v.campaignId].count++;
    acc[v.campaignId].amount += v.amountCredited;
    return acc;
  }, {});

  const campaignBreakdown = Object.entries(byCampaign)
    .map(([campaignId, stats]) => ({
      campaign: campaigns.find((c) => c.id === campaignId),
      ...stats,
    }))
    .filter((item) => item.campaign)
    .sort((a, b) => b.amount - a.amount);

  const uniqueCampaigns = campaignBreakdown.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21] mb-1">
        My Impact
      </h1>
      <p className="text-sm text-[#5E6572] mb-8">
        Your ad-watching history and the difference you&apos;ve made.
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-[10px] bg-[#FEF3E8] border border-[#F28C28]/20 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21]">
            ${totalRaised.toFixed(2)}
          </p>
          <p className="text-xs font-medium text-[#C96F1A] uppercase tracking-wider mt-1">Raised</p>
        </div>
        <div className="p-4 rounded-[10px] bg-[#EBF3FE] border border-[#2B7DE9]/20 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21]">
            {totalAds}
          </p>
          <p className="text-xs font-medium text-[#2B7DE9] uppercase tracking-wider mt-1">Ads Watched</p>
        </div>
        <div className="p-4 rounded-[10px] bg-[#E6F5EB] border border-[#34A853]/20 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21]">
            {uniqueCampaigns}
          </p>
          <p className="text-xs font-medium text-[#34A853] uppercase tracking-wider mt-1">Campaigns</p>
        </div>
      </div>

      {totalAds === 0 ? (
        /* Empty state */
        <div className="text-center py-16 border border-[#E8EAED] rounded-[14px] bg-[#F8F9FA]">
          <div className="w-14 h-14 rounded-full bg-[#FEF3E8] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28C28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#1A1D21] mb-2">
            No ads watched yet
          </p>
          <p className="text-sm text-[#8C939E] mb-5 max-w-xs mx-auto">
            Watch your first ad to start raising money for a campaign you care about.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white font-bold py-3 px-8 rounded-[10px] transition-colors text-sm"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <>
          {/* Campaign breakdown */}
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-[#8C939E] mb-3">
            Campaigns You&apos;ve Supported
          </h2>
          <div className="border border-[#E8EAED] rounded-[14px] overflow-hidden divide-y divide-[#E8EAED] mb-8">
            {campaignBreakdown.map(({ campaign: c, count, amount }) => {
              if (!c) return null;
              return (
                <Link
                  key={c.id}
                  href={`/campaign/${c.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-[#F8F9FA] transition-colors"
                >
                  <div className="relative w-12 h-12 rounded-[6px] overflow-hidden flex-shrink-0">
                    <Image src={c.imageUrl} alt={c.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[#1A1D21] truncate">
                      {c.title}
                    </h4>
                    <p className="text-xs text-[#8C939E]">
                      {count} ad{count !== 1 ? "s" : ""} watched
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-[#34A853]">${amount.toFixed(2)}</p>
                    <p className="text-xs text-[#8C939E]">raised</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Recent activity */}
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-[#8C939E] mb-3">
            Recent Activity
          </h2>
          <div className="space-y-2">
            {adViews.slice(0, 10).map((view) => {
              const c = campaigns.find((camp) => camp.id === view.campaignId);
              return (
                <div
                  key={view.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-[#F8F9FA] border border-[#E8EAED]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EBF3FE] flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B7DE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1D21]">
                      Watched &ldquo;<span className="font-medium">{view.adTitle}</span>&rdquo;
                    </p>
                    <p className="text-xs text-[#8C939E]">
                      {c?.title ?? "Unknown campaign"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#34A853] flex-shrink-0">
                    +${view.amountCredited.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
