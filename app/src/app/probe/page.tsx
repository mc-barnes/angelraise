// Throwaway smoke-test route for Slice A.5. Removed in Slice G.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listCampaigns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProbePage() {
  const { env } = await getCloudflareContext({ async: true });
  const campaigns = await listCampaigns(env.DB, { limit: 100 });
  const first = campaigns[0];

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>D1 Smoke Test</h1>
      <p>Total campaigns from D1: {campaigns.length}</p>
      {first ? (
        <ul>
          <li>id: {first.id}</li>
          <li>title: {first.title}</li>
          <li>goalAmount (dollars): {first.goalAmount}</li>
          <li>raisedAmount (dollars): {first.raisedAmount}</li>
          <li>costPerView (dollars): {first.costPerView}</li>
          <li>totalAdViews: {first.totalAdViews}</li>
          <li>createdAt: {first.createdAt.toISOString()}</li>
        </ul>
      ) : (
        <p>No campaigns found.</p>
      )}
    </main>
  );
}
