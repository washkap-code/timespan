import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solve, DEFAULT_WEIGHTS, type Employee, type Shift, type SolveWeights, type CustomConstraint } from "@/lib/solver/solver";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveApiKeyAuth } from "@/lib/api-auth";
import { solveLimitForPlan } from "@/lib/plan-limits";

export async function POST(request: Request) {
  // API-key path: stateless — the caller sends the full dataset and gets a
  // result back directly, nothing is read from or written to their account's
  // stored data. This is what the public API docs describe ("JSON in, JSON
  // out") and keeps a leaked key's blast radius limited to compute, not data.
  const apiKeyAuth = await resolveApiKeyAuth(request);
  if (apiKeyAuth) {
    const limit = solveLimitForPlan(apiKeyAuth.planId);
    const limitResult = rateLimit(`solve:key:${apiKeyAuth.keyId}`, limit, 60_000);
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: `Rate limit exceeded for your plan (${limit}/min). Upgrade your plan for higher limits.` },
        { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
      );
    }

    let body: { employees?: Employee[]; shifts?: Shift[]; weights?: SolveWeights; custom_constraints?: CustomConstraint[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!Array.isArray(body.employees) || !Array.isArray(body.shifts) || body.employees.length === 0 || body.shifts.length === 0) {
      return NextResponse.json(
        { error: "employees and shifts arrays are required in the request body for API-key calls." },
        { status: 400 }
      );
    }
    const weights: SolveWeights = { ...DEFAULT_WEIGHTS, ...(body.weights ?? {}) };
    const result = solve(body.employees, body.shifts, 900, weights, body.custom_constraints ?? []);
    return NextResponse.json({ mode: "stateless", ...result });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Solving is CPU-bound and writes to the DB, so it's the most expensive
  // endpoint we expose — cap it per user to blunt scripted abuse or runaway
  // client loops. IP is included as a secondary key so a single compromised
  // account can't be used to flood from many IPs unnoticed.
  const ip = getClientIp(request);
  const limitResult = rateLimit(`solve:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": String(limitResult.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  rateLimit(`solve-ip:${ip}`, 60, 60_000);

  let weights: SolveWeights = DEFAULT_WEIGHTS;
  let label = "Schedule";
  try {
    const body = await request.json();
    if (body?.weights) weights = { ...DEFAULT_WEIGHTS, ...body.weights };
    if (body?.label) label = body.label;
  } catch {
    // No body sent — use defaults.
  }

  const [{ data: employees, error: e1 }, { data: shifts, error: e2 }, { data: customConstraints }] = await Promise.all([
    supabase.from("employees").select("id,name,skills,max_shifts,unavailable_days"),
    supabase.from("shifts").select("id,label,day,start_hour,end_hour,required_skill"),
    supabase.from("custom_constraints").select("id,label,type,severity,weight,params,enabled").eq("enabled", true),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!employees?.length || !shifts?.length)
    return NextResponse.json({ error: "Add employees and shifts first (or load demo data)." }, { status: 400 });

  const result = solve(
    employees as Employee[],
    shifts as Shift[],
    900,
    weights,
    (customConstraints ?? []) as CustomConstraint[]
  );

  const { data: schedule, error: e3 } = await supabase
    .from("schedules")
    .insert({
      user_id: user.id,
      name: `${label} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      status: result.score.hard === 0 ? "feasible" : "infeasible",
      score_hard: result.score.hard,
      score_soft: result.score.soft,
      constraint_breakdown: result.breakdown,
      weights_used: weights,
      metrics: result.metrics,
    })
    .select()
    .single();
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const { error: e4 } = await supabase.from("schedule_assignments").insert(
    result.assignments.map((a) => ({
      schedule_id: schedule.id,
      shift_id: a.shift_id,
      employee_id: a.employee_id,
    }))
  );
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  // Fire configured webhooks (best-effort, does not block the response).
  supabase
    .from("webhooks")
    .select("url,secret")
    .eq("user_id", user.id)
    .eq("event", "schedule.solved")
    .eq("is_active", true)
    .then(({ data: hooks }) => {
      for (const hook of hooks ?? []) {
        fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(hook.secret ? { "X-Webhook-Secret": hook.secret } : {}) },
          body: JSON.stringify({ event: "schedule.solved", schedule_id: schedule.id, score: result.score, metrics: result.metrics }),
        }).catch(() => {});
      }
    });

  return NextResponse.json({ schedule, ...result });
}
