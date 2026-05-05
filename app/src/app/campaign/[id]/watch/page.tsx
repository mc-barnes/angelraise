"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Ad } from "@/data/types";

export default function WatchAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { campaigns, getRandomAd, recordAdView } = useApp();
  const router = useRouter();

  const campaign = campaigns.find((c) => c.id === id);
  const [ad, setAd] = useState<Ad | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "complete" | "crediting">("loading");

  useEffect(() => {
    const chosen = getRandomAd();
    setAd(chosen);
    setTimeLeft(chosen.durationSeconds);
    setPhase("playing");
  }, [getRandomAd]);

  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setPhase("complete");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleComplete = useCallback(() => {
    if (!ad || phase === "crediting") return;
    setPhase("crediting");
    recordAdView(id, ad.title, "Anonymous User");
    router.push(`/campaign/${id}`);
  }, [id, ad, phase, recordAdView, router]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#5E6572]">Campaign not found.</p>
      </div>
    );
  }

  const isFunded = campaign.raisedAmount >= campaign.goalAmount;
  if (isFunded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-[#E6F5EB] flex items-center justify-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="text-[#1A1D21] font-semibold">This campaign is fully funded!</p>
        <button
          onClick={() => router.push(`/campaign/${id}`)}
          className="text-sm text-[#2B7DE9] hover:text-[#1F6AD4] font-semibold transition-colors"
        >
          Back to campaign
        </button>
      </div>
    );
  }

  const progress = ad ? ((ad.durationSeconds - timeLeft) / ad.durationSeconds) * 100 : 0;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F8F9FA] px-6">
      <div className="max-w-xl w-full">
        {/* Context bar */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8C939E] mb-1">
            Watching ad for
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#1A1D21]">
            {campaign.title}
          </p>
        </div>

        {/* Video player */}
        <div className="aspect-video bg-[#1A1D21] rounded-[14px] flex items-center justify-center text-white relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
          {phase === "loading" && (
            <p className="text-[#8C939E]">Loading ad...</p>
          )}

          {phase === "playing" && ad && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <p className="text-sm text-white/80 font-medium">{ad.title}</p>
                <p className="text-xs text-white/50 mt-1">by {ad.advertiserName}</p>
              </div>
              {/* Timer pill */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full tabular-nums">
                {timeLeft}s
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                <div
                  className="h-full bg-[#F28C28] transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}

          {phase === "complete" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#34A853]/20 flex items-center justify-center mb-3 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm text-white/80 font-medium">Ad complete!</p>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="mt-6 text-center">
          {phase === "playing" && (
            <p className="text-sm text-[#8C939E]">
              Watch the full ad to credit <span className="font-semibold text-[#F28C28]">${campaign.costPerView.toFixed(2)}</span> to this campaign
            </p>
          )}

          {(phase === "complete" || phase === "crediting") && (
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F5EB] text-sm font-semibold text-[#34A853] mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ${campaign.costPerView.toFixed(2)} ready to credit
              </div>
              <p className="text-sm text-[#5E6572] mb-5">
                for &ldquo;{campaign.title}&rdquo;
              </p>
              <button
                onClick={handleComplete}
                disabled={phase === "crediting"}
                className={`font-bold py-3.5 px-10 rounded-[10px] transition-colors text-sm ${
                  phase === "crediting"
                    ? "bg-[#F1F3F5] text-[#8C939E] cursor-not-allowed"
                    : "bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white shadow-[0_4px_14px_rgba(43,125,233,0.3)]"
                }`}
              >
                {phase === "crediting" ? "Crediting..." : "Credit Campaign & Continue"}
              </button>
            </div>
          )}
        </div>

        {/* Cancel */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/campaign/${id}`)}
            className="text-xs text-[#8C939E] hover:text-[#5E6572] transition-colors"
          >
            Cancel — go back without crediting
          </button>
        </div>
      </div>
    </div>
  );
}
