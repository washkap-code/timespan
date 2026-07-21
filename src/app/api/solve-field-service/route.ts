import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solveFieldService, type Technician, type FieldJob } from "@/lib/solver/field-service-solver";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limitResult = rateLimit(`solve-field-service:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  rateLimit(`solve-field-service-ip:${ip}`, 60, 60_000);

  let label = "Field service run";
  try {
    const body = await request.json();
    if (body?.label) label = body.label;
  } catch {
    // No body sent — use default label.
  }

  const [{ data: technicians, error: e1 }, { data: jobs, error: e2 }] = await Promise.all([
    supabase.from("field_technicians").select("id,name,skills,start_lat,start_lng,shift_start_hour,shift_end_hour"),
    supabase.from("field_jobs").select("id,label,lat,lng,required_skill,duration_minutes,window_start_hour,window_end_hour,priority"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!technicians?.length || !jobs?.length)
    return NextResponse.json({ error: "Add technicians and jobs first (or load demo data)." }, { status: 400 });

  const result = await solveFieldService(technicians as Technician[], jobs as FieldJob[], 900);

  const { data: run, error: e3 } = await supabase
    .from("field_runs")
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

  const { error: e4 } = await supabase.from("field_assignments").insert(
    result.assignments.map((a) => ({
      run_id: run.id,
      job_id: a.job_id,
      technician_id: a.technician_id,
      sequence: a.sequence,
      eta_hour: a.eta_hour,
    }))
  );
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  return NextResponse.json({ run, ...result });
}
