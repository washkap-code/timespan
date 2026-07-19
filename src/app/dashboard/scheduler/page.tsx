"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee, Shift, Assignment } from "@/lib/solver/solver";

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

export default function SchedulerPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [score, setScore] = useState<{ hard: number; soft: number } | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: emps }, { data: shs }] = await Promise.all([
      supabase.from("employees").select("id,name,skills,max_shifts,unavailable_days").order("name"),
      supabase.from("shifts").select("id,label,day,start_hour,end_hour,required_skill").order("day"),
    ]);
    setEmployees((emps as Employee[]) ?? []);
    setShifts((shs as Shift[]) ?? []);
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
    setScore(null);
    setBusy(null);
  }

  async function runSolve() {
    setBusy("Solving…");
    setError(null);
    const res = await fetch("/api/solve", { method: "POST" });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Solve failed");
    else {
      setAssignments(json.assignments);
      setScore(json.score);
      setExplanation(json.explanation);
    }
    setBusy(null);
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
        <div className="flex gap-3">
          <button
            onClick={seedDemo}
            disabled={!!busy}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary-light/50 hover:bg-surface disabled:opacity-50"
          >
            Load demo roster
          </button>
          <button
            onClick={runSolve}
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

      {score && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center gap-6">
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                score.hard === 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {score.hard === 0 ? "Feasible" : "Infeasible"}
            </span>
            <span className="font-mono text-sm text-muted">
              score: {score.hard}hard / {score.soft}soft
            </span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {explanation.map((line) => (
              <li key={line} className="text-sm text-muted">
                / {line}
              </li>
            ))}
          </ul>
        </div>
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
