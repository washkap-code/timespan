import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Stripe webhook receiver. This endpoint has no user session — Stripe calls
 * it server-to-server — so authenticity comes entirely from verifying the
 * signature against STRIPE_WEBHOOK_SECRET, never from anything in the
 * request body itself. Once verified, billing writes go through the
 * `apply_stripe_billing_update` Postgres function (security definer, see
 * migration stripe_webhook_apply_fn) rather than a service-role key.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured (STRIPE_WEBHOOK_SECRET missing)." }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  const supabase = createPublicClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id ?? session.metadata?.organization_id ?? null;
        const planId = session.metadata?.plan_id ?? null;
        await supabase.rpc("apply_stripe_billing_update", {
          p_org_id: orgId,
          p_customer_id: typeof session.customer === "string" ? session.customer : null,
          p_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          p_status: "active",
          p_plan_id: planId,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const planId = (subscription.metadata?.plan_id as string | undefined) ?? null;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
        await supabase.rpc("apply_stripe_billing_update", {
          p_org_id: (subscription.metadata?.organization_id as string | undefined) ?? null,
          p_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
          p_subscription_id: subscription.id,
          p_status: status,
          p_plan_id: event.type === "customer.subscription.deleted" ? "launch" : planId,
        });
        break;
      }
      default:
        // Other event types are ignored — not relevant to billing state.
        break;
    }
  } catch (e) {
    // Log-worthy, but respond 200 anyway once signature is verified — Stripe
    // will retry on non-2xx, and a DB hiccup shouldn't cause runaway retries
    // for an event we successfully authenticated.
    console.error("Stripe webhook handling error:", e);
  }

  return NextResponse.json({ received: true });
}
