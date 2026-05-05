"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { Campaign, AdView, Ad } from "@/data/types";
import { mockCampaigns, mockAds } from "@/data/mockData";
import { COST_PER_VIEW } from "@/theme";

interface AppState {
  campaigns: Campaign[];
  adViews: AdView[];
  ads: Ad[];
  addCampaign: (campaign: Omit<Campaign, "id" | "raisedAmount" | "totalAdViews" | "costPerView" | "createdAt">) => string;
  recordAdView: (campaignId: string, adTitle: string, viewerName: string) => void;
  getRandomAd: () => Ad;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [adViews, setAdViews] = useState<AdView[]>([]);

  const addCampaign = useCallback(
    (input: Omit<Campaign, "id" | "raisedAmount" | "totalAdViews" | "costPerView" | "createdAt">) => {
      const id = crypto.randomUUID();
      const newCampaign: Campaign = {
        ...input,
        id,
        raisedAmount: 0,
        totalAdViews: 0,
        costPerView: COST_PER_VIEW,
        createdAt: new Date(),
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
      return id;
    },
    []
  );

  const recordAdView = useCallback(
    (campaignId: string, adTitle: string, viewerName: string) => {
      const view: AdView = {
        id: crypto.randomUUID(),
        campaignId,
        viewerName,
        adTitle,
        amountCredited: COST_PER_VIEW,
        viewedAt: new Date(),
      };
      setAdViews((prev) => [view, ...prev]);
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? {
                ...c,
                raisedAmount: Math.min(c.raisedAmount + COST_PER_VIEW, c.goalAmount),
                totalAdViews: c.totalAdViews + 1,
              }
            : c
        )
      );
    },
    []
  );

  const getRandomAd = useCallback(() => {
    return mockAds[Math.floor(Math.random() * mockAds.length)];
  }, []);

  const value = useMemo(
    () => ({ campaigns, adViews, ads: mockAds, addCampaign, recordAdView, getRandomAd }),
    [campaigns, adViews, addCampaign, recordAdView, getRandomAd]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
