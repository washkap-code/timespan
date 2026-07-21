import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solvePickupDelivery, type Vehicle, type DeliveryJob } from "@/lib/solver/pickup-delivery-solver";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveApiKeyAuth } from "@/lib/api-auth";
import { solveLimitForPlan } from "@/lib/plan-limits";

export async function POST(request: Request) {
  // API-key path: stateless, same pattern as /api/solve — see comment there.
  const apiKeyAuth = await resolveApiKeyAuth(request);
  if (apiKeyAuth) {
    const limit = solveLimitForPlan(apiKeyAuth.planId);
    const limitResult = rateLimit(`solve-pickup-delivery:key:${apiKeyAuth.keyId}`, limit, 60_000);
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: `Rate limit exceeded for your plan (${limit}/min). Upgrade your plan for higher limits.` },
        { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
      );
    }
    let body: { vehicles?: Vehicle[]; jobs?: DeliveryJob[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!Array.isArray(body.vehicles) || !Array.isArray(body.jobs) || body.vehicles.length === 0 || body.jobs.length === 0) {
      return NextResponse.json(
        { error: "vehicles and jobs arrays are required in the request body for API-key calls." },
        { status: 400 }
      );
    }
    const result = await solvePickupDelivery(body.vehicles, body.jobs, 900);
    return NextResponse.json({ mode: "stateless", ...result });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limitResult = rateLimit(`solve-pickup-delivery:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  rateLimit(`solve-pickup-delivery-ip:${ip}`, 60, 60_000);

  let label = "Pickup & delivery run";
  try {
    const body = await request.json();
    if (body?.label) label = body.label;
  } catch {
    // No body sent — use default label.
  }

  const [{ data: vehicles, error: e1 }, { data: jobs, error: e2 }] = await Promise.all([
    supabase.from("pd_vehicles").select("id,name,capacity,start_lat,start_lng,shift_start_hour,shift_end_hour"),
    supabase
      .from("pd_jobs")
      .select(
        "id,label,pickup_lat,pickup_lng,delivery_lat,delivery_lng,demand,pickup_window_start_hour,pickup_window_end_hour,delivery_window_start_hour,delivery_window_end_hour,priority"
      ),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!vehicles?.length || !jobs?.length)
    return NextResponse.json({ error: "Add vehicles and job pairs first (or load demo data)." }, { status: 400 });

  const result = await solvePickupDelivery(vehicles as Vehicle[], jobs as DeliveryJob[], 900);

  const { data: run, error: e3 } = await supabase
    .from("pd_runs")
    .insert({
      user_id: user.id,
      name: `${label} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      status: result.score.hard === 0 ? "feasible" : "infeasible",
      score_hard: result.score.hard,
      score_soft: result.score.soft,
      constraint_breakdown: result.breakdown,
      metrics: result.metrics,
    })
    .select()
    .single();
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const { error: e4 } = await supabase.from("pd_assignments").insert(
    result.assignments.map((a) => ({
      run_id: run.id,
      job_id: a.job_id,
      vehicle_id: a.vehicle_id,
      pickup_sequence: a.pickup_sequence,
      delivery_sequence: a.delivery_sequence,
      pickup_eta_hour: a.pickup_eta_hour,
      delivery_eta_hour: a.delivery_eta_hour,
    }))
  );
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  return NextResponse.json({ run, ...result });
}
