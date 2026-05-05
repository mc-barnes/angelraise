"use client";

import { use } from "react";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import Image from "next/image";
import type { Campaign, AdView } from "@/data/types";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { campaigns, adViews } = useApp();

  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-[#5E6572]">Campaign not found.</p>
        <Link href="/" className="text-[#2B7DE9] underline mt-4 inline-block">
          Back to Browse
        </Link>
      </div>
    );
  }

  const campaignViews = adViews.filter((v) => v.campaignId === id);
  const pct = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);

  return (
    <div>
      {/* Hero image */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        <Image src={campaign.imageUrl} alt={campaign.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-6xl mx-auto">
          <Link href="/" className="text-sm text-white/70 hover:text-white mb-3 inline-block">
            &larr; Back to campaigns
          </Link>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3E8] text-[#C96F1A] mb-3 ml-4">
            {campaign.category}
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-extrabold text-white leading-tight max-w-2xl">
            {campaign.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left: info */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 text-sm text-[#5E6572] mb-5">
              <span className="font-semibold text-[#1A1D21]">{campaign.hostName}</span>
              <span className="text-[#D1D5DB]">&middot;</span>
              <span>{campaign.hostDescription}</span>
            </div>

            <p className="text-[#5E6572] leading-relaxed mb-8">{campaign.description}</p>

            <div className="border-t border-[#E8EAED] pt-6">
              <ActivityFeed views={campaignViews} />
            </div>
          </div>

          {/* Right: funding sidebar */}
          <div className="md:col-span-2">
            <div className="border border-[#E8EAED] rounded-[14px] bg-white p-5 sticky top-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21]">
                    ${campaign.raisedAmount.toFixed(2)}
                  </span>
                  <span className="text-sm text-[#8C939E]">
                    of ${campaign.goalAmount} goal
                  </span>
                </div>
                <ProgressBar campaign={campaign} />
                <div className="flex justify-between text-xs text-[#8C939E] mt-2">
                  <span>{Math.round(pct)}% funded</span>
                  <span>{campaign.totalAdViews.toLocaleString()} ad views</span>
                </div>
              </div>

              <WatchButton campaign={campaign} />

              <div className="mt-5 pt-4 border-t border-[#E8EAED]">
                <HowItWorks costPerView={campaign.costPerView} />
              </div>

              <p className="mt-4 pt-4 border-t border-[#E8EAED] text-xs text-[#8C939E]">
                Created {campaign.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared components ── */

function ProgressBar({ campaign }: { campaign: Campaign }) {
  const pct = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
  const funded = campaign.raisedAmount >= campaign.goalAmount;
  return (
    <div className="h-3 bg-[#F1F3F5] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          funded ? "bg-[#34A853]" : pct > 80 ? "bg-[#E8A317]" : "bg-[#F28C28]"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function HowItWorks({ costPerView }: { costPerView: number }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C939E] mb-3">
        How it works
      </h4>
      <ol className="text-sm text-[#5E6572] space-y-2">
        <li className="flex gap-2">
          <span className="w-5 h-5 rounded-full bg-[#FEF3E8] text-[#C96F1A] text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
          Watch a short video ad (~15 seconds)
        </li>
        <li className="flex gap-2">
          <span className="w-5 h-5 rounded-full bg-[#FEF3E8] text-[#C96F1A] text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
          ${costPerView.toFixed(2)} is credited to this campaign
        </li>
        <li className="flex gap-2">
          <span className="w-5 h-5 rounded-full bg-[#FEF3E8] text-[#C96F1A] text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
          Repeat to raise more — no money from your pocket
        </li>
      </ol>
    </div>
  );
}

function ActivityFeed({ views }: { views: AdView[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-[#1A1D21] mb-3">Recent Activity</h3>
      {views.length === 0 ? (
        <p className="text-sm text-[#8C939E]">No ad views yet. Be the first!</p>
      ) : (
        <ul className="space-y-2">
          {views.slice(0, 5).map((view) => (
            <li key={view.id} className="text-sm text-[#5E6572] bg-[#F8F9FA] rounded-[10px] px-3 py-2.5 border border-[#E8EAED]">
              <span className="font-semibold text-[#1A1D21]">{view.viewerName}</span>{" "}
              watched &ldquo;{view.adTitle}&rdquo; — <span className="font-semibold text-[#34A853]">${view.amountCredited.toFixed(2)}</span> raised
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WatchButton({ campaign }: { campaign: Campaign }) {
  const funded = campaign.raisedAmount >= campaign.goalAmount;
  if (funded) {
    return (
      <div className="bg-[#E6F5EB] text-center py-4 rounded-[10px] text-sm font-bold text-[#34A853]">
        Fully Funded!
      </div>
    );
  }
  return (
    <Link
      href={`/campaign/${campaign.id}/watch`}
      className="block w-full text-center bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white font-bold py-3.5 rounded-[10px] transition-colors text-sm"
    >
      Watch an Ad to Raise ${campaign.costPerView.toFixed(2)}
    </Link>
  );
}
