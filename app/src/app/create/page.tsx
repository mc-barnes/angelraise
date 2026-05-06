"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignCategory } from "@/data/types";

const CATEGORIES: { value: CampaignCategory; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "community", label: "Community" },
  { value: "environment", label: "Environment" },
  { value: "animals", label: "Animals" },
  { value: "arts", label: "Arts" },
  { value: "religious", label: "Religious" },
  { value: "humanitarian", label: "Humanitarian" },
];

const DEFAULT_HOST_DESCRIPTION = "Nonprofit organization";
const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CampaignCategory>("community");
  const [goalAmount, setGoalAmount] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostDescription, setHostDescription] = useState("");

  const goalAmountNumber = Number(goalAmount);
  const canSubmit =
    !isPending &&
    title.trim().length >= 5 &&
    description.trim().length >= 10 &&
    hostName.trim().length > 0 &&
    Number.isInteger(goalAmountNumber) &&
    goalAmountNumber >= 100;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          imageUrl: DEFAULT_IMAGE_URL,
          goalAmount: goalAmountNumber,
          hostName: hostName.trim(),
          hostDescription:
            hostDescription.trim() || DEFAULT_HOST_DESCRIPTION,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Request failed (${res.status})`);
        return;
      }

      const { id } = (await res.json()) as { id: string };
      router.push(`/campaign/${id}`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1A1D21] mb-2">
          Create a Campaign
        </h1>
        <p className="text-sm text-[#5E6572]">
          Set up a fundraising campaign for your nonprofit. Supporters watch
          ads to raise money — no donations required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label
            htmlFor="campaign-title"
            className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
          >
            Campaign Title
          </label>
          <input
            id="campaign-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Baby Blankets for Carle Pediatrics"
            className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 placeholder:text-[#8C939E] transition-colors"
            maxLength={100}
          />
          <p className="text-xs text-[#8C939E] mt-1">
            {title.length}/100 characters (min 5)
          </p>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="campaign-description"
            className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
          >
            Description
          </label>
          <textarea
            id="campaign-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your campaign and how the funds will be used..."
            rows={4}
            className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 placeholder:text-[#8C939E] resize-none transition-colors"
            maxLength={500}
          />
          <p className="text-xs text-[#8C939E] mt-1">
            {description.length}/500 characters (min 10)
          </p>
        </div>

        {/* Category + Goal — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="campaign-category"
              className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
            >
              Category
            </label>
            <select
              id="campaign-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as CampaignCategory)
              }
              className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="campaign-goal"
              className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
            >
              Fundraising Goal ($)
            </label>
            <input
              id="campaign-goal"
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="500"
              min={100}
              max={100000}
              step={1}
              className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 placeholder:text-[#8C939E] transition-colors"
            />
            <p className="text-xs text-[#8C939E] mt-1">
              Whole dollars only, minimum $100
            </p>
          </div>
        </div>

        {/* Org section */}
        <div className="border-t border-[#E8EAED] pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8C939E] mb-4">
            Organization Info
          </p>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="org-name"
                className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
              >
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g., Carle Foundation Hospital"
                className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 placeholder:text-[#8C939E] transition-colors"
                maxLength={100}
              />
            </div>

            <div>
              <label
                htmlFor="org-description"
                className="block text-sm font-semibold text-[#1A1D21] mb-1.5"
              >
                Organization Description
                <span className="font-normal text-[#8C939E] ml-1">
                  (optional)
                </span>
              </label>
              <input
                id="org-description"
                type="text"
                value={hostDescription}
                onChange={(e) => setHostDescription(e.target.value)}
                placeholder="One-line description of your organization"
                className="w-full border border-[#E8EAED] rounded-[10px] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#2B7DE9] focus:ring-1 focus:ring-[#2B7DE9]/20 placeholder:text-[#8C939E] transition-colors"
                maxLength={200}
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-[10px] border border-[#F28C28]/30 bg-[#FEF3E8] px-4 py-3 text-sm text-[#C96F1A]"
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-1 py-3.5 rounded-[10px] font-bold text-sm transition-all ${
              canSubmit
                ? "bg-[#2B7DE9] hover:bg-[#1F6AD4] text-white shadow-[0_4px_14px_rgba(43,125,233,0.3)]"
                : "bg-[#F1F3F5] text-[#8C939E] cursor-not-allowed"
            }`}
          >
            {isPending ? "Creating…" : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            disabled={isPending}
            className="px-6 py-3.5 rounded-[10px] border border-[#E8EAED] text-sm font-semibold text-[#5E6572] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
