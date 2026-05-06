import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { getCampaign } from "@/lib/db";
import WatchAdClient from "./_components/WatchAdClient";

export const dynamic = "force-dynamic";

export default async function WatchAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const campaign = await getCampaign(env.DB, id);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#5E6572]">Campaign not found.</p>
      </div>
    );
  }

  if (campaign.raisedAmount >= campaign.goalAmount) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-[#E6F5EB] flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
        <p className="text-[#1A1D21] font-semibold">
          This campaign is fully funded!
        </p>
        <Link
          href={`/campaign/${id}`}
          className="text-sm text-[#2B7DE9] hover:text-[#1F6AD4] font-semibold transition-colors"
        >
          Back to campaign
        </Link>
      </div>
    );
  }

  return (
    <WatchAdClient
      campaignId={campaign.id}
      campaignTitle={campaign.title}
      costPerView={campaign.costPerView}
    />
  );
}
