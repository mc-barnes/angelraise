import type { CampaignCategory } from "@/data/types";
import { isUuid } from "./session";

const CATEGORIES: ReadonlySet<CampaignCategory> = new Set<CampaignCategory>([
  "education",
  "health",
  "community",
  "environment",
  "animals",
  "arts",
  "religious",
  "humanitarian",
]);

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isString = (v: unknown): v is string => typeof v === "string";

const trimmedString = (
  v: unknown,
  min: number,
  max: number
): string | null => {
  if (!isString(v)) return null;
  const s = v.trim();
  if (s.length < min || s.length > max) return null;
  return s;
};

const isValidUrl = (v: string): boolean => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

export interface ValidatedCampaignInput {
  title: string;
  description: string;
  category: CampaignCategory;
  imageUrl: string;
  goalAmount: number;
  hostName: string;
  hostDescription: string;
}

export const validateCampaignInput = (
  body: unknown
): ValidationResult<ValidatedCampaignInput> => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const title = trimmedString(b.title, 1, 100);
  if (!title) return { ok: false, error: "title must be 1-100 chars" };

  const description = trimmedString(b.description, 1, 500);
  if (!description)
    return { ok: false, error: "description must be 1-500 chars" };

  if (
    !isString(b.category) ||
    !CATEGORIES.has(b.category as CampaignCategory)
  ) {
    return { ok: false, error: "invalid category" };
  }

  const imageUrl = trimmedString(b.imageUrl, 1, 2048);
  if (!imageUrl) return { ok: false, error: "imageUrl required" };
  if (!isValidUrl(imageUrl))
    return { ok: false, error: "imageUrl must be a valid URL" };

  if (typeof b.goalAmount !== "number" || !Number.isFinite(b.goalAmount)) {
    return { ok: false, error: "goalAmount must be a number" };
  }
  if (!Number.isInteger(b.goalAmount) || b.goalAmount < 1) {
    return {
      ok: false,
      error: "goalAmount must be a positive integer (dollars)",
    };
  }

  const hostName = trimmedString(b.hostName, 1, 100);
  if (!hostName) return { ok: false, error: "hostName must be 1-100 chars" };

  const hostDescription = trimmedString(b.hostDescription, 1, 200);
  if (!hostDescription)
    return { ok: false, error: "hostDescription must be 1-200 chars" };

  return {
    ok: true,
    value: {
      title,
      description,
      category: b.category as CampaignCategory,
      imageUrl,
      goalAmount: b.goalAmount,
      hostName,
      hostDescription,
    },
  };
};

export interface ValidatedAdViewInput {
  campaignId: string;
  adTitle: string;
}

export const validateAdViewInput = (
  body: unknown
): ValidationResult<ValidatedAdViewInput> => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  if (!isString(b.campaignId) || !isUuid(b.campaignId)) {
    return { ok: false, error: "campaignId must be a valid UUID" };
  }
  const adTitle = trimmedString(b.adTitle, 1, 100);
  if (!adTitle) return { ok: false, error: "adTitle must be 1-100 chars" };

  return { ok: true, value: { campaignId: b.campaignId, adTitle } };
};
