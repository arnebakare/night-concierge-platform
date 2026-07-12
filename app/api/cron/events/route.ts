import { NextResponse } from "next/server";
import { importEventsFromConfiguredSources } from "@/lib/services/event-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importEventsFromConfiguredSources();
  return NextResponse.json(result);
}
