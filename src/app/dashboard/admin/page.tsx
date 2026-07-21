import { createClient } from "@/lib/supabase/server";

export default async function AdminOverview() {
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: orgCount },
    { count: employeeCount },
    { count: shiftCount },
    { count: scheduleCount },
    { data: schedules },
    { data: orgs },
    { count: openTickets },
    { count: roadmapCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("shifts").select("*", { count: "exact", head: true }),
    supabase.from("schedules").select("*", { count: "exact", head: true }),
    supabase.from("schedules").select("id,name,status,score_hard,score_soft,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("organizations").select("plan_id"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("roadmap_requests").select("*", { count: "exact", head: true }),
  ]);

  const feasible = (schedules ?? []).filter((s) => s.status === "feasible").length;
  const planCounts = (orgs ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.plan_id] = (acc[o.plan_id] ?? 0) + 1;
    return acc;
  }, {});

  const kpis = [
    { label: "Users", value: userCount ?? 0 },
    { label: "Organizations", value: orgCount ?? 0 },
    { label: "Employees managed", value: employeeCount ?? 0 },
    { label: "Shifts defined", value: shiftCount ?? 0 },
    { label: "Schedules solved", value: scheduleCount ?? 0 },
    { label: "Open support tickets", value: openTickets ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
      <p className="mt-1 text-sm text-muted">Cross-tenant metrics across every organization on TimeSpan.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-3xl font-bold text-gradient">{k.value}</p>
            <p className="mt-1 text-sm text-muted">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Plan distribution</h2>
          <p className="mt-1 text-sm text-muted">Organizations per plan tier.</p>
          <div className="mt-5 space-y-3">
            {["launch", "team", "enterprise"].map((planId) => {
              const count = planCounts[planId] ?? 0;
              const total = orgCount || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={planId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{planId}</span>
                    <span className="text-muted">{count} org{count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Solve quality</h2>
          <p className="mt-1 text-sm text-muted">Most recent runs across the platform.</p>
          <div className="mt-5 flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-success">{feasible}</p>
              <p className="text-xs text-muted">feasible (of last {schedules?.length ?? 0})</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-warning">{(schedules?.length ?? 0) - feasible}</p>
              <p className="text-xs text-muted">infeasible</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{roadmapCount ?? 0}</p>
              <p className="text-xs text-muted">roadmap items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Recent schedule runs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Score</th>
                <th className="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(schedules ?? []).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2.5 pr-4">{s.name}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "feasible" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                    {s.score_hard}h / {s.score_soft}s
                  </td>
                  <td className="py-2.5 text-muted">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {(!schedules || schedules.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    No schedules solved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
