import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeClient } from "@/lib/services/stripe";
import { writeAuditLog } from "@/lib/services/audit";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = createStripeClient();
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { data: payment } = await supabase
      .from("request_payments")
      .update({
        status: "PAID",
        provider_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        paid_at: new Date().toISOString()
      })
      .eq("provider_checkout_session_id", session.id)
      .select("id, request_id, created_by")
      .maybeSingle();
    if (payment) await writePaymentAudit(payment.id, payment.request_id, payment.created_by, "STRIPE_DEPOSIT_PAID", session.id);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { data: payment } = await supabase
      .from("request_payments")
      .update({ status: "CANCELLED" })
      .eq("provider_checkout_session_id", session.id)
      .select("id, request_id, created_by")
      .maybeSingle();
    if (payment) await writePaymentAudit(payment.id, payment.request_id, payment.created_by, "STRIPE_DEPOSIT_CANCELLED", session.id);
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const { data: payment } = await supabase
      .from("request_payments")
      .update({ status: "FAILED" })
      .eq("provider_payment_intent_id", intent.id)
      .select("id, request_id, created_by")
      .maybeSingle();
    if (payment) await writePaymentAudit(payment.id, payment.request_id, payment.created_by, "STRIPE_DEPOSIT_FAILED", intent.id);
  }

  return NextResponse.json({ received: true });
}

async function writePaymentAudit(paymentId: string, requestId: string, userId: string | null, action: string, providerEventId: string) {
  if (!userId) return;
  const supabase = createAdminClient();
  await writeAuditLog(supabase, {
    userId,
    action,
    entityType: "request_payments",
    entityId: paymentId,
    metadata: { requestId, providerEventId }
  });
}
