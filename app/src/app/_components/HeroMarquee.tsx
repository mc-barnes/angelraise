import Link from "next/link";
import Image from "next/image";
import type { Campaign } from "@/data/types";

interface HeroMarqueeProps {
  marquee: Campaign | null;
  totalRaised: number;
  totalViews: number;
  fundedCount: number;
}

// Hero spans up to 1152px wide on a 2x display = 2304 source pixels needed.
// Seeded Unsplash URLs request only w=600, which the optimizer can't upscale.
const upscaleUnsplashSource = (url: string, width = 2400): string => {
  if (!url.includes("images.unsplash.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.delete("h");
    if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return url;
  }
};

export default function HeroMarquee({
  marquee,
  totalRaised,
  totalViews,
  fundedCount,
}: HeroMarqueeProps) {
  if (!marquee) return null;

  const pct =
    marquee.goalAmount === 0
      ? 0
      : Math.min((marquee.raisedAmount / marquee.goalAmount) * 100, 100);

  const heroImageSrc = upscaleUnsplashSource(marquee.imageUrl);

  return (
    <>
      {/* Top stats ticker — full-bleed strip */}
      <div className="bg-[#F8F9FA] border-b border-[#E8EAED]">
        <div className="max-w-6xl mx-auto px-6 py-2 flex flex-wrap justify-center items-center gap-x-5 gap-y-1 text-[12.5px] text-[#5E6572]">
          <span>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-[#1A1D21]">
              ${totalRaised.toFixed(0)}
            </span>{" "}
            raised
          </span>
          <span
            className="w-[3px] h-[3px] rounded-full bg-[#8C939E]"
            aria-hidden
          />
          <span>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-[#1A1D21]">
              {totalViews.toLocaleString()}
            </span>{" "}
            ads watched
          </span>
          <span
            className="w-[3px] h-[3px] rounded-full bg-[#8C939E]"
            aria-hidden
          />
          <span>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-[#1A1D21]">
              {fundedCount}
            </span>{" "}
            {fundedCount === 1 ? "campaign" : "campaigns"} funded
          </span>
          <span
            className="w-[3px] h-[3px] rounded-full bg-[#8C939E]"
            aria-hidden
          />
          <span className="text-[#8C939E]">since launch</span>
        </div>
      </div>

      {/* Hero + 3-step wrapper */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Hero block with full-bleed image */}
        <div className="relative rounded-[20px] overflow-hidden bg-[#1A1D21] min-h-[480px]">
          <Image
            src={heroImageSrc}
            alt={marquee.title}
            fill
            sizes="(max-width: 1152px) 100vw, 1152px"
            preload
            className="object-cover opacity-85"
          />

          {/* Mobile overlay — vertical, stronger for legibility */}
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 100%)",
            }}
            aria-hidden
          />
          {/* Desktop overlay — left-to-right, dark over text, light over card */}
          <div
            className="absolute inset-0 hidden sm:block"
            style={{
              background:
                "linear-gradient(110deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 100%)",
            }}
            aria-hidden
          />

          {/* Content overlay — flex on mobile, grid on desktop */}
          <div className="relative flex flex-col justify-end gap-6 p-6 min-h-[480px] sm:grid sm:grid-cols-[1.2fr_1fr] sm:gap-6 sm:p-10 sm:items-end">
            {/* Left: headline block */}
            <div className="text-white">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-bold tracking-[0.1em] uppercase text-white mb-3.5">
                ★ Featured this week
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-[34px] sm:text-[46px] leading-[1.05] font-extrabold tracking-[-0.02em]">
                Watch an ad.
                <br />
                <span className="text-[#F28C28]">Fund a nonprofit.</span>
                <br />
                No donations.
              </h1>
              <p className="mt-3.5 text-[14px] sm:text-[15px] leading-[1.5] text-white/[0.88] max-w-[420px]">
                Pick a campaign. Watch a 15-second ad. An advertiser covers the
                cost — and the nonprofit gets 100% of it.
              </p>
            </div>

            {/* Right: glassmorphic marquee card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-[14px] p-[18px] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
              <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#C96F1A]">
                {marquee.hostName}
              </div>
              <div className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[#1A1D21] mt-1 leading-[1.3]">
                {marquee.title}
              </div>
              <p className="mt-2 text-[13px] text-[#5E6572] leading-[1.45] line-clamp-3">
                {marquee.description}
              </p>
              <div
                className="mt-3.5 h-2 rounded-full bg-[#F1F3F5] overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(pct)}% funded`}
              >
                <div
                  className="h-full rounded-full bg-[#F28C28]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-[#5E6572]">
                <span>
                  <span className="font-bold text-[#1A1D21]">
                    ${marquee.raisedAmount.toFixed(0)}
                  </span>{" "}
                  raised
                </span>
                <span>
                  of{" "}
                  <span className="font-bold text-[#1A1D21]">
                    ${marquee.goalAmount.toFixed(0)}
                  </span>{" "}
                  · {Math.round(pct)}%
                </span>
              </div>
              <Link
                href={`/campaign/${marquee.id}`}
                className="mt-3.5 block w-full text-center py-3 bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white text-[14px] font-bold rounded-[10px] transition-colors"
              >
                Watch an ad for this campaign
              </Link>
            </div>
          </div>
        </div>

        {/* 3-step strip */}
        <div className="mt-7 bg-white border border-[#E8EAED] rounded-[14px] p-5 sm:p-[22px] grid grid-cols-1 sm:grid-cols-3">
          <div className="py-3 sm:py-0 sm:px-5 sm:first:pl-0">
            <div className="font-[family-name:var(--font-display)] text-[28px] sm:text-[32px] font-extrabold text-[#F28C28] leading-none mb-2">
              01
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[#1A1D21]">
              Watch an ad
            </h3>
            <p className="mt-1 text-[13px] text-[#5E6572] leading-[1.45]">
              15 seconds, in-browser. No sign-up, no payment.
            </p>
          </div>
          <div className="py-3 sm:py-0 sm:px-5 border-t sm:border-t-0 sm:border-l border-[#E8EAED]">
            <div className="font-[family-name:var(--font-display)] text-[28px] sm:text-[32px] font-extrabold text-[#2B7DE9] leading-none mb-2">
              02
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[#1A1D21]">
              Advertiser pays
            </h3>
            <p className="mt-1 text-[13px] text-[#5E6572] leading-[1.45]">
              5¢ per view, billed to the brand running the ad.
            </p>
          </div>
          <div className="py-3 sm:py-0 sm:px-5 sm:last:pr-0 border-t sm:border-t-0 sm:border-l border-[#E8EAED]">
            <div className="font-[family-name:var(--font-display)] text-[28px] sm:text-[32px] font-extrabold text-[#34A853] leading-none mb-2">
              03
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[#1A1D21]">
              Nonprofit funded
            </h3>
            <p className="mt-1 text-[13px] text-[#5E6572] leading-[1.45]">
              100% of that payment goes to the campaign you picked.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
