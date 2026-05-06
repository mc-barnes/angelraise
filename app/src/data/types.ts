export type CampaignCategory =
  | "education"
  | "health"
  | "community"
  | "environment"
  | "animals"
  | "arts"
  | "religious"
  | "humanitarian";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  category: CampaignCategory;
  imageUrl: string;
  goalAmount: number;
  raisedAmount: number;
  costPerView: number;
  totalAdViews: number;
  hostName: string;
  hostDescription: string;
  createdAt: Date;
}

export interface AdView {
  id: string;
  campaignId: string;
  adTitle: string;
  amountCredited: number;
  viewedAt: Date;
}
