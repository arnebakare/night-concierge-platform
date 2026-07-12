import { NextResponse } from "next/server";
import { submitPublicRequest } from "@/lib/actions/request-actions";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) return NextResponse.json({ ok: false, message: "Request body is too large." }, { status: 413 });
  try {
    const payload = await request.json();
    const result = await submitPublicRequest(payload);
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON request body." }, { status: 400 });
  }
}
