export function GET() {
  return Response.json({ status: "ok", service: "night-concierge", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
