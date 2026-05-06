import type { AdView, Campaign, CampaignCategory } from "@/data/types";

const CENTS_PER_DOLLAR = 100;

const centsToDollars = (cents: number): number => cents / CENTS_PER_DOLLAR;
const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * CENTS_PER_DOLLAR);

interface CampaignRow {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  goal_amount: number;
  raised_amount: number;
  cost_per_view: number;
  total_ad_views: number;
  host_name: string;
  host_description: string;
  host_id: string | null;
  created_at: number;
}

const rowToCampaign = (row: CampaignRow): Campaign => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category as CampaignCategory,
  imageUrl: row.image_url,
  goalAmount: centsToDollars(row.goal_amount),
  raisedAmount: centsToDollars(row.raised_amount),
  costPerView: centsToDollars(row.cost_per_view),
  totalAdViews: row.total_ad_views,
  hostName: row.host_name,
  hostDescription: row.host_description,
  createdAt: new Date(row.created_at),
});

interface AdViewRow {
  id: string;
  campaign_id: string;
  user_id: string | null;
  anon_session_id: string | null;
  ad_title: string;
  amount_credited: number;
  viewed_at: number;
}

const rowToAdView = (row: AdViewRow): AdView => ({
  id: row.id,
  campaignId: row.campaign_id,
  adTitle: row.ad_title,
  amountCredited: centsToDollars(row.amount_credited),
  viewedAt: new Date(row.viewed_at),
});

export const listCampaigns = async (
  db: D1Database,
  opts: { limit?: number } = {}
): Promise<Campaign[]> => {
  const limit = opts.limit ?? 100;
  const { results } = await db
    .prepare("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<CampaignRow>();
  return results.map(rowToCampaign);
};

export const getCampaign = async (
  db: D1Database,
  id: string
): Promise<Campaign | null> => {
  const row = await db
    .prepare("SELECT * FROM campaigns WHERE id = ?")
    .bind(id)
    .first<CampaignRow>();
  return row ? rowToCampaign(row) : null;
};

export const listRecentAdViewsForCampaign = async (
  db: D1Database,
  campaignId: string,
  limit = 5
): Promise<AdView[]> => {
  const { results } = await db
    .prepare(
      "SELECT * FROM ad_views WHERE campaign_id = ? ORDER BY viewed_at DESC LIMIT ?"
    )
    .bind(campaignId, limit)
    .all<AdViewRow>();
  return results.map(rowToAdView);
};

export interface AdViewWithCampaign extends AdView {
  campaignTitle: string;
}

export const listAdViewsForSession = async (
  db: D1Database,
  sessionId: string,
  opts: { limit?: number } = {}
): Promise<AdViewWithCampaign[]> => {
  const limit = opts.limit ?? 100;
  const { results } = await db
    .prepare(
      `SELECT av.*, c.title AS campaign_title
         FROM ad_views av
         JOIN campaigns c ON c.id = av.campaign_id
        WHERE av.anon_session_id = ?
        ORDER BY av.viewed_at DESC
        LIMIT ?`
    )
    .bind(sessionId, limit)
    .all<AdViewRow & { campaign_title: string }>();
  return results.map((row) => ({
    ...rowToAdView(row),
    campaignTitle: row.campaign_title,
  }));
};

export interface CreateCampaignInput {
  title: string;
  description: string;
  category: CampaignCategory;
  imageUrl: string;
  goalAmount: number;
  hostName: string;
  hostDescription: string;
}

const DEFAULT_COST_PER_VIEW_CENTS = 5;

export const createCampaign = async (
  db: D1Database,
  input: CreateCampaignInput
): Promise<{ id: string }> => {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO campaigns
         (id, title, description, category, image_url, goal_amount, raised_amount,
          cost_per_view, total_ad_views, host_name, host_description, host_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, NULL, ?)`
    )
    .bind(
      id,
      input.title,
      input.description,
      input.category,
      input.imageUrl,
      dollarsToCents(input.goalAmount),
      DEFAULT_COST_PER_VIEW_CENTS,
      input.hostName,
      input.hostDescription,
      now
    )
    .run();
  return { id };
};

export interface RecordAdViewInput {
  campaignId: string;
  adTitle: string;
  anonSessionId: string;
}

export type RecordAdViewResult =
  | {
      ok: true;
      id: string;
      amountCredited: number;
      raisedAmount: number;
    }
  | { ok: false; error: "not_found" | "fully_funded" };

export const recordAdView = async (
  db: D1Database,
  input: RecordAdViewInput
): Promise<RecordAdViewResult> => {
  // The amount_credited and the funded check are computed in SQL so the
  // read-decide-write happens inside the atomic batch. D1 serialises batches
  // against a single database, so concurrent callers see each other's writes
  // and over-fund races are eliminated.
  const id = crypto.randomUUID();
  const now = Date.now();

  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO ad_views
           (id, campaign_id, user_id, anon_session_id, ad_title, amount_credited, viewed_at)
         SELECT ?, ?, NULL, ?, ?,
                MIN(c.cost_per_view, c.goal_amount - c.raised_amount), ?
           FROM campaigns c
          WHERE c.id = ? AND c.raised_amount < c.goal_amount`
      )
      .bind(
        id,
        input.campaignId,
        input.anonSessionId,
        input.adTitle,
        now,
        input.campaignId
      ),
    db
      .prepare(
        `UPDATE campaigns
            SET raised_amount = raised_amount
                  + COALESCE((SELECT amount_credited FROM ad_views WHERE id = ?), 0),
                total_ad_views = total_ad_views
                  + (CASE WHEN EXISTS (SELECT 1 FROM ad_views WHERE id = ?) THEN 1 ELSE 0 END)
          WHERE id = ?`
      )
      .bind(id, id, input.campaignId),
    db
      .prepare("SELECT amount_credited FROM ad_views WHERE id = ?")
      .bind(id),
    db
      .prepare("SELECT raised_amount FROM campaigns WHERE id = ?")
      .bind(input.campaignId),
  ]);

  const adViewRows = results[2].results as { amount_credited: number }[];
  const campaignRows = results[3].results as { raised_amount: number }[];

  if (campaignRows.length === 0) {
    return { ok: false, error: "not_found" };
  }
  if (adViewRows.length === 0) {
    return { ok: false, error: "fully_funded" };
  }

  return {
    ok: true,
    id,
    amountCredited: centsToDollars(adViewRows[0].amount_credited),
    raisedAmount: centsToDollars(campaignRows[0].raised_amount),
  };
};
