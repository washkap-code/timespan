"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskResource, Job, JobAssignment, TaskConstraintBreakdown, TaskSolveMetrics } from "@/lib/solver/task-solver";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEMO_RESOURCES = [
  { name: "Team Atlas", skills: ["backend", "infra"], capacity_hours_per_day: 8 },
  { name: "Team Nova", skills: ["frontend", "design"], capacity_hours_per_day: 8 },
  { name: "Team Orbit", skills: ["backend", "frontend"], capacity_hours_per_day: 6 },
];

function demoJobs(resourceless: true) {
  const jobs: Omit<Job, "id" | "depends_on">[] = [
    { label: "Design API contract", target_day: 0, duration_hours: 3, priority: 1, required_skill: "backend" },
    { label: "Build auth service", target_day: 1, duration_hours: 5, priority: 1, required_skill: "backend" },
    { label: "Design onboarding UI", target_day: 0, duration_hours: 4, priority: 2, required_skill: "design" },
    { label: "Build onboarding UI", target_day: 2, duration_hours: 6, priority: 2, required_skill: "frontend" },
    { label: "Wire infra for staging", target_day: 1, duration_hours: 4, priority: 3, required_skill: "infra" },
    { label: "Integration testing", target_day: 3, duration_hours: 5, priority: 2, required_skill: "backend" },
    { label: "Polish & QA pass", target_day: 4, duration_hours: 4, priority: 4, required_skill: "frontend" },
  ];
  return jobs;
}

interface RunResult {
  score: { hard: number; soft: number };
  metrics: TaskSolveMetrics;
  breakdown: TaskConstraintBreakdown[];
}

export default function TaskSchedulerPage() {
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: res }, { data: js }] = await Promise.all([
      supabase.from("task_resources").select("id,name,skills,capacity_hours_per_day").order("name"),
      supabase
        .from("task_jobs")
        .select("id,label,target_day,duration_hours,priority,required_skill,depends_on")
        .order("target_day"),
    ]);
    setResources((res as TaskResource[]) ?? []);
    setJobs((js as Job[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function seedDemo() {
    setBusy("Loading demo project…");
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    await supabase.from("task_jobs").delete().neq("target_day", -1);
    await supabase.from("task_resources").delete().neq("capacity_hours_per_day", -1);
    const { error: e1 } = await supabase
      .from("task_resources")
      .insert(DEMO_RESOURCES.map((r) => ({ ...r, user_id: uid })));
    const { data: inserted, error: e2 } = await supabase
      .from("task_jobs")
      .insert(demoJobs(true).map((j) => ({ ...j, user_id: uid, depends_on: [] })))
      .select("id,label");
    // Wire a couple of realistic dependencies now that we have real ids.
    if (inserted && inserted.length >= 4) {
      const byLabel = new Map(inserted.map((j) => [j.label, j.id]));
      await supabase
        .from("task_jobs")
        .update({ depends_on: [byLabel.get("Design API contract")] })
        .eq("id", byLabel.get("Build auth service"));
      await supabase
        .from("task_jobs")
        .update({ depends_on: [byLabel.get("Design onboarding UI")] })
        .eq("id", byLabel.get("Build onboarding UI"));
      await supabase
        .from("task_jobs")
        .update({ depends_on: [byLabel.get("Build auth service"), byLabel.get("Build onboarding UI")] })
        .eq("id", byLabel.get("Integration testing"));
      await supabase
        .from("task_jobs")
        .update({ depends_on: [byLabel.get("Integration testing")] })
        .eq("id", byLabel.get("Polish & QA pass"));
    }
    if (e1 || e2) setError((e1 ?? e2)!.message);
    await load();
    setAssignments([]);
    setResult(null);
    setBusy(null);
  }

  async function handleSolve() {
    setBusy("Solving…");
    setError(null);
    try {
      const res = await fetch("/api/solve-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Task run" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Solve failed");
      setAssignments(json.assignments);
      setResult({ score: json.score, metrics: json.metrics, breakdown: json.breakdown });
      setExplanation(json.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Solve failed");
    }
    setBusy(null);
  }

  const resourceName = (id: string | null) => resources.find((r) => r.id === id)?.name ?? "—";
  const assignmentFor = (jobId: string) => assignments.find((a) => a.job_id === jobId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Scheduler</h1>
          <p className="mt-1 text-sm text-muted">
            Assign dependent jobs to resources across the week — skills, dependency order, and capacity solved together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedDemo}
            disabled={!!busy}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary-light/50 hover:bg-surface disabled:opacity-50"
          >
            Load demo project
          </button>
          <button
            onClick={handleSolve}
            disabled={!!busy || jobs.length === 0}
            className="glow-ring cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ?? "Solve schedule"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result.score.hard === 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {result.score.hard === 0 ? "Feasible" : "Infeasible"}
            </span>
            <span className="font-mono text-xs text-muted">
              {result.score.hard}h / {result.score.soft}s
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-accent">{result.metrics.coverage}%</p>
              <p className="text-[11px] text-muted">Coverage</p>
            </div>
            <div>
              <p className="text-xl font-bold text-primary-light">{result.metrics.onTimeRate}%</p>
              <p className="text-[11px] text-muted">On-time rate</p>
            </div>
            <div>
              <p className="text-xl font-bold text-warning">{result.metrics.utilization}%</p>
              <p className="text-[11px] text-muted">Utilization</p>
            </div>
          </div>
          <div className="mt-4 space-y-1 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Constraint X-Ray</p>
            {result.breakdown
              .filter((b) => b.count > 0)
              .map((b) => (
                <div key={b.code} className="flex items-center justify-between text-xs">
                  <span className={b.severity === "hard" ? "text-destructive" : "text-muted"}>
                    {b.code} · {b.label}
                  </span>
                  <span className="font-mono">{b.count}</span>
                </div>
              ))}
            {result.breakdown.every((b) => b.count === 0) && <p className="text-xs text-success">No violations detected.</p>}
          </div>
        </div>
      )}

      {explanation.length > 0 && (
        <ul className="mt-4 space-y-1">
          {explanation.map((line) => (
            <li key={line} className="text-sm text-muted">
              / {line}
            </li>
          ))}
        </ul>
      )}

      {/* Weekly grid */}
      <div className="mt-8 overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 gap-3">
          {DAYS.map((d, i) => (
            <div key={d}>
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">{d}</p>
              <div className="space-y-2">
                {jobs
                  .filter((j) => (assignmentFor(j.id)?.assigned_day ?? j.target_day) === i)
                  .map((j) => {
                    const a = assignmentFor(j.id);
                    const assigned = a?.resource_id != null;
                    const late = a?.assigned_day != null && a.assigned_day > j.target_day;
                    return (
                      <div
                        key={j.id}
                        className={`rounded-xl border p-3 transition-all duration-200 ${
                          !a
                            ? "border-border bg-surface"
                            : assigned
                              ? late
                                ? "border-warning/50 bg-warning/10"
                                : "border-primary/50 bg-primary/10 shadow-glow"
                              : "border-destructive/50 bg-destructive/10"
                        }`}
                      >
                        <p className="text-xs font-semibold">{j.label}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {j.duration_hours}h · P{j.priority}
                          {j.required_skill ? ` · ${j.required_skill}` : ""}
                        </p>
                        {a && (
                          <p className={`mt-1.5 text-xs font-medium ${assigned ? (late ? "text-warning" : "text-primary-light") : "text-destructive"}`}>
                            {assigned ? resourceName(a.resource_id) : "Unassigned"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                {jobs.filter((j) => (assignmentFor(j.id)?.assigned_day ?? j.target_day) === i).length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                    No jobs
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Resources ({resources.length})</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="mt-1 text-xs text-muted">
                skills: {r.skills.join(", ") || "none"} · {r.capacity_hours_per_day}h/day capacity
              </p>
            </div>
          ))}
          {resources.length === 0 && (
            <p className="text-sm text-muted">No resources yet — load the demo project to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
