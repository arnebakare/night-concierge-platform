import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";
import { getStripeConfigStatus } from "@/lib/services/stripe";

export function GET() {
  const whatsApp = getWhatsAppConfigStatus(process.env.WHATSAPP_DESTINATION_NUMBER);
  const stripe = getStripeConfigStatus();
  return Response.json({
    status: "ok",
    service: "night-concierge",
    timestamp: new Date().toISOString(),
    checks: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      whatsapp: whatsApp.ready,
      whatsappInboundValidation: process.env.TWILIO_VALIDATE_WEBHOOKS === "false" ? "disabled" : Boolean(process.env.TWILIO_AUTH_TOKEN),
      openAiSchedule: Boolean(process.env.OPENAI_API_KEY),
      stripeDeposits: stripe.ready,
      stripeWebhooks: stripe.webhookReady,
      inboundMonitorCron: Boolean(process.env.CRON_SECRET)
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
