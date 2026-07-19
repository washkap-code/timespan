import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solve, type Employee, type Shift } from "@/lib/solver/solver";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: employees, error: e1 }, { data: shifts, error: e2 }] = await Promise.all([
    supabase.from("employees").select("id,name,skills,max_shifts,unavailable_days"),
    supabase.from("shifts").select("id,label,day,start_hour,end_hour,required_skill"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  if (!employees?.length || !shifts?.length)
    return NextResponse.json({ error: "Add employees and shifts first (or load demo data)." }, { status: 400 });

  const result = solve(employees as Employee[], shifts as Shift[], 900);

  const { data: schedule, error: e3 } = await supabase
    .from("schedules")
    .insert({
      user_id: user.id,
      name: `Schedule ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      status: result.score.hard === 0 ? "feasible" : "infeasible",
      score_hard: result.score.hard,
      score_soft: result.score.soft,
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

  return NextResponse.json({ schedule, ...result });
}
