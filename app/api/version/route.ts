import { NextResponse } from "next/server";
import { getBuildInfo } from "@/lib/services/build-info";

export function GET() {
  return NextResponse.json(getBuildInfo());
}
