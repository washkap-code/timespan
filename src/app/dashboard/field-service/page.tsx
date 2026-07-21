"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Technician, FieldJob, FieldAssignment, FieldConstraintBreakdown, FieldSolveMetrics } from "@/lib/solver/field-service-solver";

// Demo sites clustered around a plausible metro area so real drive-time
// estimates (when GOOGLE_MAPS_API_KEY is set) look sensible.
const DEMO_TECHNICIANS = [
  { name: "Alex Rivera", skills: ["hvac", "electrical"], start_lat: 51.5074, start_lng: -0.1278, shift_start_hour: 8, shift_end_hour: 17 },
  { name: "Priya Shah", skills: ["plumbing"], start_lat: 51.515, start_lng: -0.09, shift_start_hour: 8, shift_end_hour: 16 },
  { name: "Sam Okafor", skills: ["hvac", "plumbing"], start_lat: 51.49, start_lng: -0.15, shift_start_hour: 9, shift_end_hour: 18 },
];

const DEMO_JOBS = [
  { label: "AC unit repair — Riverside Office", lat: 51.505, lng: -0.11, required_skill: "hvac", duration_minutes: 90, window_start_hour: 8, window_end_hour: 12, priority: 1 },
  { label: "Boiler service — Kings Cross", lat: 51.53, lng: -0.12, required_skill: "plumbing", duration_minutes: 60, window_start_hour: 9, window_end_hour: 15, priority: 2 },
  { label: "Electrical inspection — Canary Wharf", lat: 51.505, lng: -0.02, required_skill: "electrical", duration_minutes: 45, window_start_hour: 10, window_end_hour: 17, priority: 3 },
  { label: "Leak fix — Shoreditch", lat: 51.525, lng: -0.078, required_skill: "plumbing", duration_minutes: 75, window_start_hour: 8, window_end_hour: 13, priority: 1 },
  { label: "HVAC install — Camden", lat: 51.54, lng: -0.14, required_skill: "hvac", duration_minutes: 120, window_start_hour: 11, window_end_hour: 18, priority: 2 },
  { label: "Wiring check — Southbank", lat: 51.505, lng: -0.11, required_skill: "electrical", duration_minutes: 50, window_start_hour: 8, window_end_hour: 14, priority: 4 },
];

interface RunResult {
  score: { hard: number; soft: number };
  metrics: FieldSolveMetrics;
  breakdown: FieldConstraintBreakdown[];
}

export default function FieldServicePage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [jobs, setJobs] = useState<FieldJob[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: t }, { data: j }] = await Promise.all([
      supabase.from("field_technicians").select("id,name,skills,start_lat,start_lng,shift_start_hour,shift_end_hour").order("name"),
      supabase
        .from("field_jobs")
        .select("id,label,lat,lng,required_skill,duration_minutes,window_start_hour,window_end_hour,priority")
        .order("priority"),
    ]);
    setTechnicians((t as Technician[]) ?? []);
    setJobs((j as FieldJob[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function seedDemo() {
    setBusy("Loading demo territory…");
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    await supabase.from("field_jobs").delete().neq("priority", -1);
    await supabase.from("field_technicians").delete().neq("shift_start_hour", -1);
    const { error: e1 } = await supabase.from("field_technicians").insert(DEMO_TECHNICIANS.map((t) => ({ ...t, user_id: uid })));
    const { error: e2 } = await supabase.from("field_jobs").insert(DEMO_JOBS.map((j) => ({ ...j, user_id: uid })));
    if (e1 || e2) setError((e1 ?? e2)!.message);
    await load();
    setAssignments([]);
    setResult(null);
    setBusy(null);
  }

  async function handleSolve() {
    setBusy("Routing…");
    setError(null);
    try {
      const res = await fetch("/api/solve-field-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Field service run" }),
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

  const jobLabel = (id: string) => jobs.find((j) => j.id === id)?.label ?? "—";
  const routeFor = (techId: string) =>
    assignments
      .filter((a) => a.technician_id === techId)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const unassigned = assignments.filter((a) => a.technician_id === null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Field Service Routing</h1>
          <p className="mt-1 text-sm text-muted">
            Assign and sequence site visits across your technicians — skills, time windows and drive time solved together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedDemo}
            disabled={!!busy}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary-light/50 hover:bg-surface disabled:opacity-50"
          >
            Load demo territory
          </button>
          <button
            onClick={handleSolve}
            disabled={!!busy || jobs.length === 0}
            className="glow-ring cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ?? "Solve routes"}
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
              <p className="text-xl font-bold text-warning">{result.metrics.totalDriveMinutes}</p>
              <p className="text-[11px] text-muted">Total drive (min)</p>
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
          {result.metrics.distanceSource === "estimated" && (
            <p className="mt-4 text-xs text-muted">
              Drive times are straight-line estimates. Set <code className="font-mono">GOOGLE_MAPS_API_KEY</code> for real road distances.
            </p>
          )}
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

      {/* Routes */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {technicians.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="text-xs text-muted">
              {t.skills.join(", ") || "no skills"} · shift {t.shift_start_hour}:00–{t.shift_end_hour}:00
            </p>
            <div className="mt-3 space-y-2">
              {routeFor(t.id).length === 0 && <p className="text-xs text-muted">No stops assigned.</p>}
              {routeFor(t.id).map((a, i) => (
                <div key={a.job_id} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                  <p className="text-xs font-semibold">
                    {i + 1}. {jobLabel(a.job_id)}
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    ETA {a.eta_hour !== null ? `${Math.floor(a.eta_hour)}:${String(Math.round((a.eta_hour % 1) * 60)).padStart(2, "0")}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {technicians.length === 0 && (
          <p className="text-sm text-muted">No technicians yet — load the demo territory to get started.</p>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <p className="text-sm font-semibold text-destructive">Unassigned jobs ({unassigned.length})</p>
          <ul className="mt-2 space-y-1">
            {unassigned.map((a) => (
              <li key={a.job_id} className="text-xs text-muted">{jobLabel(a.job_id)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Jobs list */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Jobs ({jobs.length})</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{j.label}</p>
              <p className="mt-1 text-xs text-muted">
                {j.required_skill ?? "any skill"} · {j.duration_minutes}min · window {j.window_start_hour}:00–{j.window_end_hour}:00 · P{j.priority}
              </p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-muted">No jobs yet — load the demo territory to get started.</p>}
        </div>
      </div>
    </div>
  );
}
