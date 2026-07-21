import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: employees }, { count: shifts }, { count: schedules }, { data: latest }] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("shifts").select("*", { count: "exact", head: true }),
    supabase.from("schedules").select("*", { count: "exact", head: true }),
    supabase
      .from("schedules")
      .select("id,name,status,score_hard,score_soft,constraint_breakdown,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cards = [
    { label: "Employees", value: employees ?? 0 },
    { label: "Shifts", value: shifts ?? 0 },
    { label: "Solved schedules", value: schedules ?? 0 },
  ];

  const breakdown = (latest?.constraint_breakdown as { code: string; label: string; severity: string; count: number }[]) || [];
  const unassigned = breakdown.find((b) => b.code === "S2")?.count ?? 0;
  const totalShifts = shifts ?? 0;
  const coverage = totalShifts > 0 ? Math.round(((totalShifts - unassigned) / totalShifts) * 100) : 0;

  const isNew = (employees ?? 0) === 0 && (shifts ?? 0) === 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>

      {isNew && (
        <div className="mt-6 max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-light">Quick start</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <span className="font-mono text-primary-light">01</span>
              Open the <Link href="/dashboard/scheduler" className="cursor-pointer text-foreground underline">Shift Scheduler</Link> or{" "}
              <Link href="/dashboard/tasks" className="cursor-pointer text-foreground underline">Task Scheduler</Link> and click
              &quot;Load demo&quot; to seed sample data.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary-light">02</span>
              Click &quot;Solve&quot; to run the constraint solver and see a feasible plan with a full constraint breakdown.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-primary-light">03</span>
              Ready to integrate? Read the{" "}
              <Link href="/docs" className="cursor-pointer text-foreground underline">API documentation</Link> to call the same
              solver from your own software.
            </li>
          </ol>
        </div>
      )}

      <div className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-3xl font-bold text-gradient">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {latest && (
        <div className="mt-6 max-w-3xl rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Latest run KPIs</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-accent">{coverage}%</p>
              <p className="text-xs text-muted">Shift coverage</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${latest.status === "feasible" ? "text-success" : "text-warning"}`}>
                {latest.status === "feasible" ? "Feasible" : "Infeasible"}
              </p>
              <p className="text-xs text-muted">Plan status</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-light">
                {latest.score_hard}h / {latest.score_soft}s
              </p>
              <p className="text-xs text-muted">Score</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid max-w-3xl gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-8">
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
        <div className="rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-lg font-semibold">Task Scheduling</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Assign dependent jobs to resources across the week. Skills, dependency order, capacity and
            priority-weighted deadlines are solved together.
          </p>
          <Link
            href="/dashboard/tasks"
            className="glow-ring mt-5 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Open task scheduler
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-lg font-semibold">Field Service Routing</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sequence site visits across your technicians using real drive-time estimates. Skills, time
            windows and shift length are solved together.
          </p>
          <Link
            href="/dashboard/field-service"
            className="glow-ring mt-5 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Open field service routing
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-lg font-semibold">Pickup & Delivery Routing</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Route vehicles through pickup and delivery pairs. Capacity, precedence and time windows are
            solved together against real drive time.
          </p>
          <Link
            href="/dashboard/pickup-delivery"
            className="glow-ring mt-5 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Open pickup & delivery routing
          </Link>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8">
          <h2 className="text-lg font-semibold">Copilot</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ask questions about your latest solve in plain language — grounded in your real constraint
            breakdown and metrics, never invented.
          </p>
          <Link
            href="/dashboard/copilot"
            className="glow-ring mt-5 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Ask Copilot
          </Link>
        </div>
      </div>
    </div>
  );
}
