import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limitResult = rateLimit(`billing-checkout:${user.id}`, 10, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  rateLimit(`billing-checkout-ip:${ip}`, 30, 60_000);

  let body: { plan_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const planId = body.plan_id;
  if (!planId) return NextResponse.json({ error: "plan_id is required." }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "You need to be part of an organization to manage billing." }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id,name,price_monthly")
    .eq("id", planId)
    .single();
  if (planError || !plan) return NextResponse.json({ error: "Unknown plan." }, { status: 404 });
  if (plan.price_monthly == null) {
    return NextResponse.json(
      { error: `${plan.name} is a custom plan — contact sales instead of self-serve checkout.` },
      { status: 400 }
    );
  }
  if (Number(plan.price_monthly) <= 0) {
    return NextResponse.json({ error: `${plan.name} is free — no checkout needed.` }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      client_reference_id: profile.organization_id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(plan.price_monthly) * 100),
            recurring: { interval: "month" },
            product_data: { name: `TimeSpan ${plan.name}`, metadata: { plan_id: plan.id } },
          },
        },
      ],
      subscription_data: { metadata: { plan_id: plan.id, organization_id: profile.organization_id } },
      metadata: { plan_id: plan.id, organization_id: profile.organization_id },
      success_url: `${origin}/dashboard/admin/plans?checkout=success`,
      cancel_url: `${origin}/dashboard/admin/plans?checkout=canceled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout session creation failed." }, { status: 502 });
  }
}
