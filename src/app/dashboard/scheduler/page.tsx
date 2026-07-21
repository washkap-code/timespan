"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee, Shift, Assignment, ConstraintBreakdown, SolveMetrics, SolveWeights } from "@/lib/solver/solver";
import { DEFAULT_WEIGHTS } from "@/lib/solver/solver";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEMO_EMPLOYEES = [
  { name: "Amy Cole", skills: ["nurse", "senior"], max_shifts: 5, unavailable_days: [6] },
  { name: "Beth Fox", skills: ["nurse"], max_shifts: 5, unavailable_days: [5] },
  { name: "Chad Green", skills: ["doctor"], max_shifts: 4, unavailable_days: [] },
  { name: "Dan Jones", skills: ["nurse", "doctor"], max_shifts: 5, unavailable_days: [0] },
  { name: "Elsa Li", skills: ["nurse"], max_shifts: 3, unavailable_days: [2, 3] },
  { name: "Flo Ray", skills: ["senior", "doctor"], max_shifts: 4, unavailable_days: [] },
];

function demoShifts() {
  const shifts: Omit<Shift, "id">[] = [];
  for (let day = 0; day < 7; day++) {
    shifts.push({ label: "Early", day, start_hour: 6, end_hour: 14, required_skill: "nurse" });
    shifts.push({ label: "Late", day, start_hour: 14, end_hour: 22, required_skill: "nurse" });
    if (day < 5) shifts.push({ label: "Clinic", day, start_hour: 9, end_hour: 17, required_skill: "doctor" });
  }
  return shifts;
}

interface RunResult {
  label: string;
  score: { hard: number; soft: number };
  metrics: SolveMetrics;
  breakdown: ConstraintBreakdown[];
}

interface ConfigProfile {
  id: string;
  name: string;
  weights: SolveWeights;
  is_default: boolean;
}

export default function SchedulerPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [weights, setWeights] = useState<SolveWeights>(DEFAULT_WEIGHTS);
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [profileName, setProfileName] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: emps }, { data: shs }, { data: profs }] = await Promise.all([
      supabase.from("employees").select("id,name,skills,max_shifts,unavailable_days").order("name"),
      supabase.from("shifts").select("id,label,day,start_hour,end_hour,required_skill").order("day"),
      supabase.from("config_profiles").select("id,name,weights,is_default").order("created_at"),
    ]);
    setEmployees((emps as Employee[]) ?? []);
    setShifts((shs as Shift[]) ?? []);
    setProfiles((profs as ConfigProfile[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function seedDemo() {
    setBusy("Loading demo data…");
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    await supabase.from("shifts").delete().neq("day", -1);
    await supabase.from("employees").delete().neq("max_shifts", -1);
    const { error: e1 } = await supabase
      .from("employees")
      .insert(DEMO_EMPLOYEES.map((e) => ({ ...e, user_id: uid })));
    const { error: e2 } = await supabase
      .from("shifts")
      .insert(demoShifts().map((s) => ({ ...s, user_id: uid })));
    if (e1 || e2) setError((e1 ?? e2)!.message);
    await load();
    setAssignments([]);
    setResult(null);
    setCompareResult(null);
    setBusy(null);
  }

  async function runSolve(customWeights?: SolveWeights, label = "Schedule") {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights: customWeights ?? weights, label }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Solve failed");
    return json;
  }

  async function handleSolve() {
    setBusy("Solving…");
    setError(null);
    setCompareResult(null);
    try {
      const json = await runSolve(weights, "Schedule");
      setAssignments(json.assignments);
      setResult({ label: "Current", score: json.score, metrics: json.metrics, breakdown: json.breakdown });
      setExplanation(json.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Solve failed");
    }
    setBusy(null);
  }

  async function handleWhatIf() {
    setBusy("Running what-if comparison…");
    setError(null);
    try {
      const baseline = await runSolve(weights, "What-if: current weights");
      const fairnessFirst: SolveWeights = { ...weights, fairnessPenalty: weights.fairnessPenalty * 3 };
      const alt = await runSolve(fairnessFirst, "What-if: fairness-first");
      setAssignments(baseline.assignments);
      setResult({ label: "Current weights", score: baseline.score, metrics: baseline.metrics, breakdown: baseline.breakdown });
      setCompareResult({ label: "Fairness-first (3x)", score: alt.score, metrics: alt.metrics, breakdown: alt.breakdown });
      setExplanation(baseline.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    }
    setBusy(null);
  }

  async function saveProfile() {
    if (!profileName.trim()) return;
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("config_profiles").insert({
      user_id: userData.user?.id,
      name: profileName.trim(),
      weights,
    });
    setProfileName("");
    await load();
  }

  function applyProfile(p: ConfigProfile) {
    setWeights(p.weights);
  }

  const empName = (id: string | null) => employees.find((e) => e.id === id)?.name ?? "—";
  const assignmentFor = (shiftId: string) => assignments.find((a) => a.shift_id === shiftId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Shift Scheduler</h1>
          <p className="mt-1 text-sm text-muted">
            Constraint solver: skills, availability, overlaps, workload fairness.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedDemo}
            disabled={!!busy}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary-light/50 hover:bg-surface disabled:opacity-50"
          >
            Load demo roster
          </button>
          <button
            onClick={handleWhatIf}
            disabled={!!busy || shifts.length === 0}
            className="cursor-pointer rounded-lg border border-accent/40 px-4 py-2 text-sm font-medium text-accent transition-all duration-200 hover:bg-accent/10 disabled:opacity-50"
          >
            What-if: compare weights
          </button>
          <button
            onClick={handleSolve}
            disabled={!!busy || shifts.length === 0}
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

      {/* Config profiles — Timefold "Flow" tier equivalent */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Config profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Unassigned penalty
            <input
              type="number"
              value={weights.unassignedPenalty}
              onChange={(e) => setWeights({ ...weights, unassignedPenalty: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            />
          </label>
          <label className="text-xs text-muted">
            Same-day overlap penalty
            <input
              type="number"
              value={weights.sameDayOverlapPenalty}
              onChange={(e) => setWeights({ ...weights, sameDayOverlapPenalty: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            />
          </label>
          <label className="text-xs text-muted">
            Fairness penalty
            <input
              type="number"
              value={weights.fairnessPenalty}
              onChange={(e) => setWeights({ ...weights, fairnessPenalty: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => applyProfile(p)}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary-light/50 hover:bg-surface-2"
            >
              {p.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Save as…"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary-light"
            />
            <button
              onClick={saveProfile}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary-light/50 hover:bg-surface-2"
            >
              Save profile
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className={`mt-6 grid gap-5 ${compareResult ? "lg:grid-cols-2" : ""}`}>
          {[result, compareResult].filter(Boolean).map((r) => (
            <div key={r!.label} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-semibold">{r!.label}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    r!.score.hard === 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {r!.score.hard === 0 ? "Feasible" : "Infeasible"}
                </span>
                <span className="font-mono text-xs text-muted">
                  {r!.score.hard}h / {r!.score.soft}s
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-accent">{r!.metrics.coverage}%</p>
                  <p className="text-[11px] text-muted">Coverage</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-light">{r!.metrics.fairnessIndex}</p>
                  <p className="text-[11px] text-muted">Fairness index</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-warning">{r!.metrics.utilization}%</p>
                  <p className="text-[11px] text-muted">Utilization</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Constraint X-Ray</p>
                {r!.breakdown
                  .filter((b) => b.count > 0)
                  .map((b) => (
                    <div key={b.code} className="flex items-center justify-between text-xs">
                      <span className={b.severity === "hard" ? "text-destructive" : "text-muted"}>
                        {b.code} · {b.label}
                      </span>
                      <span className="font-mono">{b.count}</span>
                    </div>
                  ))}
                {r!.breakdown.every((b) => b.count === 0) && <p className="text-xs text-success">No violations detected.</p>}
              </div>
            </div>
          ))}
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
                {shifts
                  .filter((s) => s.day === i)
                  .sort((a, b) => a.start_hour - b.start_hour)
                  .map((s) => {
                    const a = assignmentFor(s.id);
                    const assigned = a?.employee_id != null;
                    return (
                      <div
                        key={s.id}
                        className={`rounded-xl border p-3 transition-all duration-200 ${
                          !a
                            ? "border-border bg-surface"
                            : assigned
                              ? "border-primary/50 bg-primary/10 shadow-glow"
                              : "border-warning/50 bg-warning/10"
                        }`}
                      >
                        <p className="text-xs font-semibold">{s.label}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {s.start_hour}:00–{s.end_hour}:00
                          {s.required_skill ? ` · ${s.required_skill}` : ""}
                        </p>
                        {a && (
                          <p className={`mt-1.5 text-xs font-medium ${assigned ? "text-primary-light" : "text-warning"}`}>
                            {assigned ? empName(a.employee_id) : "Unassigned"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                {shifts.filter((s) => s.day === i).length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                    No shifts
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roster */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Roster ({employees.length})</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{e.name}</p>
              <p className="mt-1 text-xs text-muted">
                skills: {e.skills.join(", ") || "none"} · max {e.max_shifts}/wk
                {e.unavailable_days.length > 0 && ` · off: ${e.unavailable_days.map((d) => DAYS[d]).join(", ")}`}
              </p>
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-sm text-muted">No employees yet — load the demo roster to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
