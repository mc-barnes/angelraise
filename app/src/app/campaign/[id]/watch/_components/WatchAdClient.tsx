"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const MOCK_ADS = [
  { title: "Nike — Just Do It", advertiserName: "Nike" },
  { title: "Coca-Cola — Open Happiness", advertiserName: "Coca-Cola" },
  { title: "Apple — Think Different", advertiserName: "Apple" },
  { title: "Google — Search On", advertiserName: "Google" },
] as const;

const AD_DURATION_SECONDS = 15;

interface Props {
  campaignId: string;
  campaignTitle: string;
  costPerView: number;
}

export default function WatchAdClient({
  campaignId,
  campaignTitle,
  costPerView,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ad] = useState(
    () => MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]
  );
  const [timeLeft, setTimeLeft] = useState(AD_DURATION_SECONDS);
  const [phase, setPhase] = useState<"playing" | "complete">("playing");

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

  const handleCredit = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      let res: Response;
      try {
        res = await fetch("/api/ad-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            adTitle: ad.title,
          }),
        });
      } catch {
        setError("Network error. Please try again.");
        return;
      }

      if (res.status === 201) {
        router.refresh();
        router.push(`/campaign/${campaignId}`);
        return;
      }

      if (res.status === 409) {
        setError(
          "This campaign was just fully funded by another supporter. No credit charged."
        );
        return;
      }

      if (res.status === 429) {
        setError("Too many requests. Please wait a minute and try again.");
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(body.error ?? `Request failed (${res.status})`);
    });
  };

  const progress =
    ((AD_DURATION_SECONDS - timeLeft) / AD_DURATION_SECONDS) * 100;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F8F9FA] px-6">
      <div className="max-w-xl w-full">
        {/* Context bar */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8C939E] mb-1">
            Watching ad for
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#1A1D21]">
            {campaignTitle}
          </p>
        </div>

        {/* Video player */}
        <div className="aspect-video bg-[#1A1D21] rounded-[14px] flex items-center justify-center text-white relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
          {phase === "playing" && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 mx-auto">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="none"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <p className="text-sm text-white/80 font-medium">{ad.title}</p>
                <p className="text-xs text-white/50 mt-1">
                  by {ad.advertiserName}
                </p>
              </div>
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full tabular-nums">
                {timeLeft}s
              </div>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34A853"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-white/80 font-medium">Ad complete!</p>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="mt-6 text-center">
          {phase === "playing" && !error && (
            <p className="text-sm text-[#8C939E]">
              Watch the full ad to credit{" "}
              <span className="font-semibold text-[#F28C28]">
                ${costPerView.toFixed(2)}
              </span>{" "}
              to this campaign
            </p>
          )}

          {error && (
            <div role="alert" className="space-y-4">
              <div className="rounded-[10px] border border-[#F28C28]/30 bg-[#FEF3E8] px-4 py-3 text-sm text-[#C96F1A]">
                {error}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/campaign/${campaignId}`)}
                className="bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white font-bold py-3.5 px-10 rounded-[10px] transition-colors text-sm shadow-[0_4px_14px_rgba(43,125,233,0.3)]"
              >
                Back to campaign
              </button>
            </div>
          )}

          {!error && phase === "complete" && (
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F5EB] text-sm font-semibold text-[#34A853] mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                ${costPerView.toFixed(2)} ready to credit
              </div>
              <p className="text-sm text-[#5E6572] mb-5">
                for &ldquo;{campaignTitle}&rdquo;
              </p>
              <button
                onClick={handleCredit}
                disabled={isPending}
                className={`font-bold py-3.5 px-10 rounded-[10px] transition-colors text-sm ${
                  isPending
                    ? "bg-[#F1F3F5] text-[#8C939E] cursor-not-allowed"
                    : "bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white shadow-[0_4px_14px_rgba(43,125,233,0.3)]"
                }`}
              >
                {isPending ? "Crediting…" : "Credit Campaign & Continue"}
              </button>
            </div>
          )}
        </div>

        {/* Cancel */}
        {!error && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(`/campaign/${campaignId}`)}
              disabled={isPending}
              className="text-xs text-[#8C939E] hover:text-[#5E6572] transition-colors disabled:opacity-50"
            >
              Cancel — go back without crediting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
