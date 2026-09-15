import { hasSupabaseBrowserEnv, hasSupabaseServiceEnv, isConfiguredValue } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReadinessCheck = { label: string; ok: boolean; detail: string };

export async function getSystemReadiness(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [
    { label: "Supabase browser connection", ok: hasSupabaseBrowserEnv(), detail: hasSupabaseBrowserEnv() ? "Configured" : "URL or anonymous key missing" },
    { label: "Supabase server connection", ok: hasSupabaseServiceEnv(), detail: hasSupabaseServiceEnv() ? "Configured" : "Service role key missing" },
    { label: "Public app URL", ok: isConfiguredValue(process.env.NEXT_PUBLIC_APP_URL), detail: isConfiguredValue(process.env.NEXT_PUBLIC_APP_URL) ? "Configured" : "Missing" },
    { label: "Meta WhatsApp Cloud API", ok: Boolean((isConfiguredValue(process.env.META_ACCESS_TOKEN) || isConfiguredValue(process.env.META_WHATSAPP_ACCESS_TOKEN)) && isConfiguredValue(process.env.META_WHATSAPP_PHONE_NUMBER_ID)), detail: "Access token and shared Phone Number ID" },
    { label: "Meta webhook validation", ok: Boolean(isConfiguredValue(process.env.META_APP_SECRET) && isConfiguredValue(process.env.META_WEBHOOK_VERIFY_TOKEN)), detail: "App secret and verification token" },
    { label: "Instagram Messaging API", ok: Boolean((isConfiguredValue(process.env.META_ACCESS_TOKEN) || isConfiguredValue(process.env.META_INSTAGRAM_ACCESS_TOKEN)) && isConfiguredValue(process.env.META_INSTAGRAM_ACCOUNT_ID)), detail: "Optional until Instagram is connected" },
    { label: "Stripe deposits", ok: isConfiguredValue(process.env.STRIPE_SECRET_KEY), detail: isConfiguredValue(process.env.STRIPE_SECRET_KEY) ? "Checkout links enabled" : "Add STRIPE_SECRET_KEY" },
    { label: "Stripe webhook", ok: isConfiguredValue(process.env.STRIPE_WEBHOOK_SECRET), detail: isConfiguredValue(process.env.STRIPE_WEBHOOK_SECRET) ? "Payment status sync enabled" : "Add STRIPE_WEBHOOK_SECRET" },
    { label: "OpenAI schedule planner", ok: isConfiguredValue(process.env.OPENAI_API_KEY), detail: isConfiguredValue(process.env.OPENAI_API_KEY) ? "Configured" : "Missing OpenAI API key" },
    { label: "Production demo mode", ok: process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true", detail: process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "Demo mode enabled" : "Demo mode disabled" }
  ];

  if (!hasSupabaseServiceEnv()) {
    checks.push({ label: "Database access", ok: false, detail: "Cannot verify without server credentials" });
    checks.push({ label: "Client accounts migration", ok: false, detail: "Migration 004 cannot be verified" });
    checks.push({ label: "Public rate limiting", ok: false, detail: "Migration 005 cannot be verified" });
    return checks;
  }

  const admin = createAdminClient();
  const [{ error: databaseError }, { error: clientMigrationError }, { error: rateLimitError }, { error: paymentError }, { error: messagingError }, { error: commissionNotesError }, { error: followUpError }, { data: destination }] = await Promise.all([
    admin.from("clubs").select("id", { head: true, count: "exact" }).limit(1),
    admin.from("clients").select("profile_id").limit(1),
    admin.from("public_request_rate_limits").select("fingerprint").limit(1),
    admin.from("request_payments").select("id").limit(1),
    admin.from("conversations").select("id").limit(1),
    admin.from("commission_rules").select("label, notes").limit(1),
    admin.from("client_follow_up_tasks").select("id").limit(1),
    admin.from("platform_settings").select("value").eq("key", "whatsapp_destination_number").maybeSingle()
  ]);
  checks.push({ label: "Database access", ok: !databaseError, detail: databaseError ? "Connection failed" : "Connected" });
  checks.push({ label: "Client accounts migration", ok: !clientMigrationError, detail: clientMigrationError ? "Apply migration 004" : "Migration 004 detected" });
  checks.push({ label: "Public rate limiting", ok: !rateLimitError, detail: rateLimitError ? "Apply migration 005" : "Migration 005 detected" });
  checks.push({ label: "Payment tables", ok: !paymentError, detail: paymentError ? "Apply migration 020" : "Migration 020 detected" });
  checks.push({ label: "Unified messaging tables", ok: !messagingError, detail: messagingError ? "Apply migration 032" : "Migration 032 detected" });
  checks.push({ label: "Commission rule notes", ok: !commissionNotesError, detail: commissionNotesError ? "Apply migration 021" : "Migration 021 commission fields detected" });
  checks.push({ label: "Client follow-up tasks", ok: !followUpError, detail: followUpError ? "Apply migration 022" : "Migration 022 detected" });
  checks.push({ label: "WhatsApp destination", ok: Boolean(destination?.value || process.env.WHATSAPP_DESTINATION_NUMBER), detail: destination?.value || process.env.WHATSAPP_DESTINATION_NUMBER ? "Configured" : "Missing" });
  return checks;
}
