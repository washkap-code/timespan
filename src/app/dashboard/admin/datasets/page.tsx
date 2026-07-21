"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  name: string;
  status: string;
  score_hard: number;
  score_soft: number;
  created_at: string;
  kind: "Shift schedule" | "Task run";
};

export default function DatasetsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "feasible" | "infeasible">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "Shift schedule" | "Task run">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: schedules }, { data: taskRuns }] = await Promise.all([
        supabase.from("schedules").select("id,name,status,score_hard,score_soft,created_at").order("created_at", { ascending: false }),
        supabase.from("task_runs").select("id,name,status,score_hard,score_soft,created_at").order("created_at", { ascending: false }),
      ]);
      const combined: Row[] = [
        ...(schedules ?? []).map((s) => ({ ...s, kind: "Shift schedule" as const })),
        ...(taskRuns ?? []).map((t) => ({ ...t, kind: "Task run" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(combined);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (query.trim() && !r.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, query, statusFilter, kindFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dataset overview</h1>
      <p className="mt-1 text-sm text-muted">
        Every solve run across the platform — shift schedules and task runs — searchable and filterable in one place.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-64 rounded-lg border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary-light"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">All types</option>
          <option value="Shift schedule">Shift schedules</option>
          <option value="Task run">Task runs</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-light"
        >
          <option value="all">All statuses</option>
          <option value="feasible">Feasible</option>
          <option value="infeasible">Infeasible</option>
        </select>
        <span className="ml-auto text-xs text-muted">
          {filtered.length} of {rows.length} runs
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.kind}:${r.id}`} className="border-t border-border">
                <td className="px-5 py-2.5">{r.name}</td>
                <td className="px-5 py-2.5 text-muted">{r.kind}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "feasible" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-2.5 font-mono text-xs text-muted">
                  {r.score_hard}h / {r.score_soft}s
                </td>
                <td className="px-5 py-2.5 text-muted">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No runs match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
