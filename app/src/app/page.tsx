import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import Image from "next/image";
import { listCampaigns } from "@/lib/db";
import type { Campaign } from "@/data/types";
import CategoryFilter from "./_components/CategoryFilter";
import HeroMarquee from "./_components/HeroMarquee";

export const dynamic = "force-dynamic";

// Hand-curated marquee for v1. Rotation logic intentionally deferred.
const MARQUEE_CAMPAIGN_ID = "00000000-0000-4000-8000-000000000001";

const pct = (c: Campaign): number =>
  c.goalAmount === 0
    ? 0
    : Math.min((c.raisedAmount / c.goalAmount) * 100, 100);

export default async function HomePage() {
  const { env } = await getCloudflareContext({ async: true });
  const campaigns = await listCampaigns(env.DB, { limit: 100 });

  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalViews = campaigns.reduce((sum, c) => sum + c.totalAdViews, 0);
  const fundedCount = campaigns.filter(
    (c) => c.raisedAmount >= c.goalAmount
  ).length;
  const activeCount = campaigns.length - fundedCount;

  const marquee =
    campaigns.find((c) => c.id === MARQUEE_CAMPAIGN_ID) ?? null;

  const now = Date.now();
  const trending = [...campaigns]
    .filter((c) => c.raisedAmount < c.goalAmount)
    .map((c) => ({
      ...c,
      velocity:
        c.totalAdViews /
        Math.max(1, (now - c.createdAt.getTime()) / 86400000),
    }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 5);

  return (
    <>
      <HeroMarquee
        marquee={marquee}
        totalRaised={totalRaised}
        totalViews={totalViews}
        fundedCount={fundedCount}
      />
      <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Trending: horizontal scroll */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider text-[#8C939E]">
            Trending Now
          </h2>
          <span className="text-xs text-[#8C939E]">
            {activeCount} active {activeCount === 1 ? "campaign" : "campaigns"}
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {trending.map((c) => (
            <Link
              key={c.id}
              href={`/campaign/${c.id}`}
              className="flex-shrink-0 w-64 rounded-[14px] overflow-hidden border border-[#E8EAED] bg-white hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="relative h-32 overflow-hidden">
                <Image
                  src={c.imageUrl}
                  alt={c.title}
                  fill
                  className="object-cover"
                />
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
                <p className="text-xs text-[#8C939E] mt-1">
                  {Math.round(pct(c))}% funded
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div id="campaigns" className="scroll-mt-6">
        <CategoryFilter campaigns={campaigns} />
      </div>
    </div>
    </>
  );
}
