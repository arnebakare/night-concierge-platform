import { hasSupabaseBrowserEnv, hasSupabaseServiceEnv, isConfiguredValue } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReadinessCheck = { label: string; ok: boolean; detail: string };

export async function getSystemReadiness(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [
    { label: "Supabase browser connection", ok: hasSupabaseBrowserEnv(), detail: hasSupabaseBrowserEnv() ? "Configured" : "URL or anonymous key missing" },
    { label: "Supabase server connection", ok: hasSupabaseServiceEnv(), detail: hasSupabaseServiceEnv() ? "Configured" : "Service role key missing" },
    { label: "Public app URL", ok: isConfiguredValue(process.env.NEXT_PUBLIC_APP_URL), detail: isConfiguredValue(process.env.NEXT_PUBLIC_APP_URL) ? "Configured" : "Missing" },
    { label: "Twilio credentials", ok: Boolean(isConfiguredValue(process.env.TWILIO_ACCOUNT_SID) && isConfiguredValue(process.env.TWILIO_AUTH_TOKEN) && isConfiguredValue(process.env.TWILIO_WHATSAPP_FROM)), detail: "Account SID, token, and WhatsApp sender" },
    { label: "Production demo mode", ok: process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true", detail: process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "Demo mode enabled" : "Demo mode disabled" }
  ];

  if (!hasSupabaseServiceEnv()) {
    checks.push({ label: "Database access", ok: false, detail: "Cannot verify without server credentials" });
    checks.push({ label: "Client accounts migration", ok: false, detail: "Migration 004 cannot be verified" });
    checks.push({ label: "Public rate limiting", ok: false, detail: "Migration 005 cannot be verified" });
    return checks;
  }

  const admin = createAdminClient();
  const [{ error: databaseError }, { error: clientMigrationError }, { error: rateLimitError }, { data: destination }] = await Promise.all([
    admin.from("clubs").select("id", { head: true, count: "exact" }).limit(1),
    admin.from("clients").select("profile_id").limit(1),
    admin.from("public_request_rate_limits").select("fingerprint").limit(1),
    admin.from("platform_settings").select("value").eq("key", "whatsapp_destination_number").maybeSingle()
  ]);
  checks.push({ label: "Database access", ok: !databaseError, detail: databaseError ? "Connection failed" : "Connected" });
  checks.push({ label: "Client accounts migration", ok: !clientMigrationError, detail: clientMigrationError ? "Apply migration 004" : "Migration 004 detected" });
  checks.push({ label: "Public rate limiting", ok: !rateLimitError, detail: rateLimitError ? "Apply migration 005" : "Migration 005 detected" });
  checks.push({ label: "WhatsApp destination", ok: Boolean(destination?.value || process.env.WHATSAPP_DESTINATION_NUMBER), detail: destination?.value || process.env.WHATSAPP_DESTINATION_NUMBER ? "Configured" : "Missing" });
  return checks;
}
