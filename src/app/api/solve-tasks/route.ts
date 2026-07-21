import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solveTasks, type TaskResource, type Job } from "@/lib/solver/task-solver";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveApiKeyAuth } from "@/lib/api-auth";
import { solveLimitForPlan } from "@/lib/plan-limits";

export async function POST(request: Request) {
  // API-key path: stateless, same pattern as /api/solve — see comment there.
  const apiKeyAuth = await resolveApiKeyAuth(request);
  if (apiKeyAuth) {
    const limit = solveLimitForPlan(apiKeyAuth.planId);
    const limitResult = rateLimit(`solve-tasks:key:${apiKeyAuth.keyId}`, limit, 60_000);
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: `Rate limit exceeded for your plan (${limit}/min). Upgrade your plan for higher limits.` },
        { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
      );
    }
    let body: { resources?: TaskResource[]; jobs?: Job[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!Array.isArray(body.resources) || !Array.isArray(body.jobs) || body.resources.length === 0 || body.jobs.length === 0) {
      return NextResponse.json(
        { error: "resources and jobs arrays are required in the request body for API-key calls." },
        { status: 400 }
      );
    }
    const result = solveTasks(body.resources, body.jobs, 900);
    return NextResponse.json({ mode: "stateless", ...result });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limitResult = rateLimit(`solve-tasks:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  rateLimit(`solve-tasks-ip:${ip}`, 60, 60_000);

  let label = "Task run";
  try {
    const body = await request.json();
    if (body?.label) label = body.label;
  } catch {
    // No body sent — use default label.
  }

  const [{ data: resources, error: e1 }, { data: jobs, error: e2 }] = await Promise.all([
    supabase.from("task_resources").select("id,name,skills,capacity_hours_per_day"),
    supabase.from("task_jobs").select("id,label,target_day,duration_hours,priority,required_skill,depends_on"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!resources?.length || !jobs?.length)
    return NextResponse.json({ error: "Add resources and jobs first (or load demo data)." }, { status: 400 });

  const result = solveTasks(resources as TaskResource[], jobs as Job[], 900);

  const { data: run, error: e3 } = await supabase
    .from("task_runs")
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

  const { error: e4 } = await supabase.from("task_assignments").insert(
    result.assignments.map((a) => ({
      run_id: run.id,
      job_id: a.job_id,
      resource_id: a.resource_id,
      assigned_day: a.assigned_day,
    }))
  );
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  return NextResponse.json({ run, ...result });
}
