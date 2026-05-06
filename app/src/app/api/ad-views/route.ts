import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { recordAdView } from "@/lib/db";
import { validateAdViewInput } from "@/lib/validation";
import { getAnonSession, setAnonSession } from "@/lib/session";

export async function POST(request: Request) {
  const { env } = getCloudflareContext();

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const rateLimit = await env.AD_VIEW_RATE_LIMITER.limit({ key: ip });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateAdViewInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const existingSession = await getAnonSession();
  const sessionId = existingSession ?? crypto.randomUUID();

  const result = await recordAdView(env.DB, {
    campaignId: validated.value.campaignId,
    adTitle: validated.value.adTitle,
    anonSessionId: sessionId,
  });

  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Campaign already fully funded" },
      { status: 409 }
    );
  }

  if (!existingSession) {
    const secure = new URL(request.url).protocol === "https:";
    await setAnonSession(sessionId, { secure });
  }

  return NextResponse.json(
    {
      id: result.id,
      amountCredited: result.amountCredited,
      raisedAmount: result.raisedAmount,
    },
    { status: 201 }
  );
}
