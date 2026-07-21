import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solve, DEFAULT_WEIGHTS, type Employee, type Shift, type SolveWeights } from "@/lib/solver/solver";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let weights: SolveWeights = DEFAULT_WEIGHTS;
  let label = "Schedule";
  try {
    const body = await request.json();
    if (body?.weights) weights = { ...DEFAULT_WEIGHTS, ...body.weights };
    if (body?.label) label = body.label;
  } catch {
    // No body sent — use defaults.
  }

  const [{ data: employees, error: e1 }, { data: shifts, error: e2 }] = await Promise.all([
    supabase.from("employees").select("id,name,skills,max_shifts,unavailable_days"),
    supabase.from("shifts").select("id,label,day,start_hour,end_hour,required_skill"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!employees?.length || !shifts?.length)
    return NextResponse.json({ error: "Add employees and shifts first (or load demo data)." }, { status: 400 });

  const result = solve(employees as Employee[], shifts as Shift[], 900, weights);

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
