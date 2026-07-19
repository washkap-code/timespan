import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: employees }, { count: shifts }, { count: schedules }] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("shifts").select("*", { count: "exact", head: true }),
    supabase.from("schedules").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Employees", value: employees ?? 0 },
    { label: "Shifts", value: shifts ?? 0 },
    { label: "Solved schedules", value: schedules ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>

      <div className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-3xl font-bold text-gradient">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-3xl rounded-2xl border border-border bg-surface p-8">
        <h2 className="text-lg font-semibold">Employee Shift Scheduling</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Load a demo roster or your own data, then run the constraint solver to generate a fair,
          feasible weekly schedule. Skills, availability, overlaps and workload balance are all
          weighed automatically.
        </p>
        <Link
          href="/dashboard/scheduler"
          className="glow-ring mt-5 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
        >
          Open scheduler
        </Link>
      </div>
    </div>
  );
}
