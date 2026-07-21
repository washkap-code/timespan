/**
 * TimeSpan shift-scheduling solver.
 *
 * Constraint-based solver in the spirit of Timefold: a construction heuristic
 * builds an initial assignment, then late-acceptance local search improves it.
 * Score is (hard, soft) — hard violations must reach 0 for a feasible plan.
 *
 * Hard constraints:
 *  H1  Required skill must be present.
 *  H2  Employee must be available on the shift's day.
 *  H3  No overlapping shifts for the same employee.
 *  H4  Max shifts per employee respected.
 *
 * Soft constraints (weights are configurable via a Config Profile):
 *  S1  Fairness: minimize variance of assigned-shift counts.
 *  S2  Minimize unassigned shifts (heavily penalized).
 *  S3  Avoid back-to-back shifts on the same day.
 */

export interface Employee {
  id: string;
  name: string;
  skills: string[];
  max_shifts: number;
  unavailable_days: number[];
}

export interface Shift {
  id: string;
  label: string;
  day: number; // 0=Mon .. 6=Sun
  start_hour: number;
  end_hour: number;
  required_skill: string | null;
}

export interface Assignment {
  shift_id: string;
  employee_id: string | null;
}

export interface ConstraintBreakdown {
  code: string;
  label: string;
  severity: "hard" | "soft";
  count: number;
  impact: number;
}

export interface SolveMetrics {
  coverage: number; // % of shifts assigned
  fairnessIndex: number; // 0-100, higher = more even distribution
  utilization: number; // % of available capacity used
}

export interface SolveWeights {
  unassignedPenalty: number;
  sameDayOverlapPenalty: number;
  fairnessPenalty: number;
}

export const DEFAULT_WEIGHTS: SolveWeights = {
  unassignedPenalty: 10,
  sameDayOverlapPenalty: 1,
  fairnessPenalty: 1,
};

export interface SolveResult {
  assignments: Assignment[];
  score: { hard: number; soft: number };
  explanation: string[];
  breakdown: ConstraintBreakdown[];
  metrics: SolveMetrics;
}

/**
 * User-defined constraints, addable/toggleable from the UI without touching
 * this file. Deliberately a small closed set of parameterized rule *types*
 * (not arbitrary user code) — that keeps the solver's attack surface
 * unchanged while still letting admins extend the model.
 */
export interface CustomConstraint {
  id: string;
  label: string;
  type: "max_consecutive_days" | "min_rest_hours" | "blackout_day";
  severity: "hard" | "soft";
  weight: number;
  params: Record<string, number>;
  enabled: boolean;
}

type Solution = Map<string, string | null>; // shift_id -> employee_id

function evaluateCustomConstraints(
  sol: Solution,
  shifts: Shift[],
  employees: Employee[],
  constraints: CustomConstraint[]
): { hardDelta: number; softDelta: number; perConstraint: Map<string, number> } {
  let hardDelta = 0;
  let softDelta = 0;
  const perConstraint = new Map<string, number>();
  if (!constraints.length) return { hardDelta, softDelta, perConstraint };

  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const perEmployee = new Map<string, Shift[]>();
  for (const [shiftId, empId] of sol) {
    if (!empId) continue;
    const list = perEmployee.get(empId) ?? [];
    list.push(shiftById.get(shiftId)!);
    perEmployee.set(empId, list);
  }

  for (const c of constraints) {
    if (!c.enabled) continue;
    let violations = 0;

    if (c.type === "blackout_day") {
      const day = c.params.day ?? -1;
      for (const [shiftId, empId] of sol) {
        if (!empId) continue;
        if (shiftById.get(shiftId)!.day === day) violations++;
      }
    } else if (c.type === "max_consecutive_days") {
      const maxDays = c.params.maxDays ?? 6;
      for (const [, list] of perEmployee) {
        const days = [...new Set(list.map((s) => s.day))].sort((a, b) => a - b);
        let run = 1;
        for (let i = 1; i < days.length; i++) {
          if (days[i] === days[i - 1] + 1) {
            run++;
            if (run > maxDays) violations++;
          } else {
            run = 1;
          }
        }
      }
    } else if (c.type === "min_rest_hours") {
      const minRest = c.params.minRestHours ?? 11;
      for (const [, list] of perEmployee) {
        const sorted = [...list].sort((a, b) => a.day * 24 + a.start_hour - (b.day * 24 + b.start_hour));
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = sorted[i - 1].day * 24 + sorted[i - 1].end_hour;
          const nextStart = sorted[i].day * 24 + sorted[i].start_hour;
          if (nextStart > prevEnd && nextStart - prevEnd < minRest) violations++;
        }
      }
    }

    perConstraint.set(c.id, violations);
    const delta = violations * c.weight;
    if (c.severity === "hard") hardDelta -= delta;
    else softDelta -= delta;
  }

  return { hardDelta, softDelta, perConstraint };
}

function overlaps(a: Shift, b: Shift): boolean {
  return a.day === b.day && a.start_hour < b.end_hour && b.start_hour < a.end_hour;
}

function scoreOf(
  sol: Solution,
  shifts: Shift[],
  employees: Employee[],
  w: SolveWeights,
  customConstraints: CustomConstraint[] = []
) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  let hard = 0;
  let soft = 0;

  const counts = new Map<string, number>();
  const perEmployee = new Map<string, Shift[]>();

  for (const [shiftId, empId] of sol) {
    const shift = shiftById.get(shiftId)!;
    if (!empId) {
      soft -= w.unassignedPenalty; // S2
      continue;
    }
    const emp = byId.get(empId);
    if (!emp) continue;
    counts.set(empId, (counts.get(empId) ?? 0) + 1);
    const list = perEmployee.get(empId) ?? [];
    list.push(shift);
    perEmployee.set(empId, list);

    if (shift.required_skill && !emp.skills.includes(shift.required_skill)) hard -= 1; // H1
    if (emp.unavailable_days.includes(shift.day)) hard -= 1; // H2
  }

  for (const [empId, list] of perEmployee) {
    const emp = byId.get(empId)!;
    if (list.length > emp.max_shifts) hard -= list.length - emp.max_shifts; // H4
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i], list[j])) hard -= 1; // H3
        else if (list[i].day === list[j].day) soft -= w.sameDayOverlapPenalty; // S3
      }
    }
  }

  // S1 fairness — penalize squared deviation from mean load
  if (employees.length > 0) {
    const mean = shifts.length / employees.length;
    for (const e of employees) {
      const c = counts.get(e.id) ?? 0;
      soft -= Math.round(Math.abs(c - mean) ** 2) * w.fairnessPenalty;
    }
  }

  if (customConstraints.length) {
    const { hardDelta, softDelta } = evaluateCustomConstraints(sol, shifts, employees, customConstraints);
    hard += hardDelta;
    soft += softDelta;
  }

  return { hard, soft };
}

function better(a: { hard: number; soft: number }, b: { hard: number; soft: number }) {
  return a.hard > b.hard || (a.hard === b.hard && a.soft > b.soft);
}

/** Structured, per-constraint breakdown — powers the "X-Ray" view in the scheduler UI. */
function analyze(
  sol: Solution,
  shifts: Shift[],
  employees: Employee[],
  customConstraints: CustomConstraint[] = []
): { breakdown: ConstraintBreakdown[]; metrics: SolveMetrics } {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const counts = new Map<string, number>();
  const perEmployee = new Map<string, Shift[]>();

  let h1 = 0;
  let h2 = 0;
  let h3 = 0;
  let h4 = 0;
  let unassigned = 0;
  let sameDayNonOverlap = 0;

  for (const [shiftId, empId] of sol) {
    const shift = shiftById.get(shiftId)!;
    if (!empId) {
      unassigned++;
      continue;
    }
    const emp = byId.get(empId);
    if (!emp) continue;
    counts.set(empId, (counts.get(empId) ?? 0) + 1);
    const list = perEmployee.get(empId) ?? [];
    list.push(shift);
    perEmployee.set(empId, list);

    if (shift.required_skill && !emp.skills.includes(shift.required_skill)) h1++;
    if (emp.unavailable_days.includes(shift.day)) h2++;
  }

  for (const [empId, list] of perEmployee) {
    const emp = byId.get(empId)!;
    if (list.length > emp.max_shifts) h4 += list.length - emp.max_shifts;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i], list[j])) h3++;
        else if (list[i].day === list[j].day) sameDayNonOverlap++;
      }
    }
  }

  const mean = employees.length > 0 ? shifts.length / employees.length : 0;
  let variance = 0;
  for (const e of employees) {
    const c = counts.get(e.id) ?? 0;
    variance += (c - mean) ** 2;
  }
  const stdDev = employees.length > 0 ? Math.sqrt(variance / employees.length) : 0;
  const fairnessIndex = mean > 0 ? Math.max(0, Math.min(100, Math.round(100 * (1 - stdDev / (mean + 1))))) : 100;
  const coverage = shifts.length > 0 ? Math.round(((shifts.length - unassigned) / shifts.length) * 100) : 100;
  const totalCapacity = employees.reduce((sum, e) => sum + e.max_shifts, 0);
  const totalAssigned = [...counts.values()].reduce((a, b) => a + b, 0);
  const utilization = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  const breakdown: ConstraintBreakdown[] = [
    { code: "H1", label: "Skill mismatch", severity: "hard", count: h1, impact: -h1 },
    { code: "H2", label: "Unavailable-day assignment", severity: "hard", count: h2, impact: -h2 },
    { code: "H3", label: "Overlapping shifts", severity: "hard", count: h3, impact: -h3 },
    { code: "H4", label: "Over max-shift load", severity: "hard", count: h4, impact: -h4 },
    { code: "S1", label: "Fairness deviation", severity: "soft", count: Math.round(variance), impact: -Math.round(variance) },
    { code: "S2", label: "Unassigned shifts", severity: "soft", count: unassigned, impact: -unassigned },
    { code: "S3", label: "Same-day back-to-back", severity: "soft", count: sameDayNonOverlap, impact: -sameDayNonOverlap },
  ];

  if (customConstraints.length) {
    const { perConstraint } = evaluateCustomConstraints(sol, shifts, employees, customConstraints);
    for (const c of customConstraints) {
      if (!c.enabled) continue;
      const count = perConstraint.get(c.id) ?? 0;
      breakdown.push({
        code: `C:${c.label}`,
        label: c.label,
        severity: c.severity,
        count,
        impact: -Math.round(count * c.weight),
      });
    }
  }

  return { breakdown, metrics: { coverage, fairnessIndex, utilization } };
}

export function solve(
  employees: Employee[],
  shifts: Shift[],
  timeMs = 900,
  weights: SolveWeights = DEFAULT_WEIGHTS,
  customConstraints: CustomConstraint[] = []
): SolveResult {
  // --- Construction heuristic: hardest shifts first, best-fit employee ---
  const sol: Solution = new Map();
  const sorted = [...shifts].sort((a, b) => {
    const aSkill = a.required_skill ? 1 : 0;
    const bSkill = b.required_skill ? 1 : 0;
    return bSkill - aSkill;
  });

  for (const shift of sorted) {
    let bestEmp: string | null = null;
    let bestScore = { hard: -Infinity, soft: -Infinity };
    for (const emp of employees) {
      sol.set(shift.id, emp.id);
      const s = scoreOf(sol, shifts, employees, weights, customConstraints);
      if (better(s, bestScore)) {
        bestScore = s;
        bestEmp = emp.id;
      }
    }
    sol.set(shift.id, bestEmp);
  }

  // --- Late-acceptance hill climbing ---
  let current = scoreOf(sol, shifts, employees, weights, customConstraints);
  let best = current;
  let bestSol: Solution = new Map(sol);
  const lateSize = 40;
  const late: { hard: number; soft: number }[] = Array(lateSize).fill(current);
  const start = Date.now();
  let iter = 0;

  while (Date.now() - start < timeMs && shifts.length > 0 && employees.length > 0) {
    iter++;
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const prev = sol.get(shift.id) ?? null;
    const pick =
      Math.random() < 0.1 ? null : employees[Math.floor(Math.random() * employees.length)].id;
    if (pick === prev) continue;
    sol.set(shift.id, pick);
    const cand = scoreOf(sol, shifts, employees, weights, customConstraints);
    const lateVal = late[iter % lateSize];
    if (better(cand, current) || cand.hard > lateVal.hard || (cand.hard === lateVal.hard && cand.soft >= lateVal.soft)) {
      current = cand;
      if (better(cand, best)) {
        best = cand;
        bestSol = new Map(sol);
      }
    } else {
      sol.set(shift.id, prev);
    }
    late[iter % lateSize] = current;
  }

  const { breakdown, metrics } = analyze(bestSol, shifts, employees, customConstraints);

  const explanation: string[] = [];
  explanation.push(
    best.hard === 0
      ? "Feasible: all hard constraints (skills, availability, overlaps, max load) satisfied."
      : `${-best.hard} hard constraint violation(s) remain — add employees, skills or availability.`
  );
  const unassigned = [...bestSol.values()].filter((v) => v === null).length;
  if (unassigned > 0) explanation.push(`${unassigned} shift(s) could not be assigned.`);
  explanation.push(`Soft score ${best.soft} after ${iter.toLocaleString()} local-search moves (fairness + rest optimization).`);

  return {
    assignments: shifts.map((s) => ({ shift_id: s.id, employee_id: bestSol.get(s.id) ?? null })),
    score: best,
    explanation,
    breakdown,
    metrics,
  };
}
