import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createCampaign } from "@/lib/db";
import { validateCampaignInput } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateCampaignInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const { id } = await createCampaign(env.DB, result.value);
  return NextResponse.json({ id }, { status: 201 });
}
