import Stripe from "stripe";

export function getStripeConfigStatus() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return {
    ready: Boolean(secretKey),
    webhookReady: Boolean(webhookSecret),
    mode: secretKey?.startsWith("sk_live_") ? "live" : secretKey?.startsWith("sk_test_") ? "test" : "missing",
    issue: secretKey ? null : "Add STRIPE_SECRET_KEY in Vercel to create deposit links."
  };
}

export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel.");
  return new Stripe(secretKey);
}
