/**
 * TimeSpan field service routing solver — the Field Service Routing API
 * vertical. Assigns and sequences field jobs (site visits) across a fleet of
 * technicians, using real drive-time estimates (src/lib/maps/distance-matrix)
 * to build feasible, low-travel routes.
 *
 * Same construction + late-acceptance local-search approach as the other two
 * solvers (solver.ts, task-solver.ts), applied to a route-sequencing domain.
 *
 * Hard constraints:
 *  H1  Required skill must be present on the assigned technician.
 *  H2  Arrival at a job must not be later than that job's time-window end.
 *  H3  A technician's route must finish by end of shift.
 *
 * Soft constraints:
 *  S1  Unassigned jobs (heavily penalized, weighted by priority).
 *  S2  Total drive time across all routes (minimized).
 */

import { getDistanceMatrix, type LatLng, type MatrixResult } from "@/lib/maps/distance-matrix";

export interface Technician {
  id: string;
  name: string;
  skills: string[];
  start_lat: number;
  start_lng: number;
  shift_start_hour: number;
  shift_end_hour: number;
}

export interface FieldJob {
  id: string;
  label: string;
  lat: number;
  lng: number;
  required_skill: string | null;
  duration_minutes: number;
  window_start_hour: number;
  window_end_hour: number;
  priority: number; // 1 (highest) .. 5 (lowest)
}

export interface FieldAssignment {
  job_id: string;
  technician_id: string | null;
  sequence: number | null;
  eta_hour: number | null;
}

export interface FieldConstraintBreakdown {
  code: string;
  label: string;
  severity: "hard" | "soft";
  count: number;
  impact: number;
}

export interface FieldSolveMetrics {
  coverage: number;
  onTimeRate: number;
  totalDriveMinutes: number;
  distanceSource: "google" | "estimated";
}

export interface FieldSolveResult {
  assignments: FieldAssignment[];
  score: { hard: number; soft: number };
  explanation: string[];
  breakdown: FieldConstraintBreakdown[];
  metrics: FieldSolveMetrics;
}

type Plan = Map<string, string[]>; // technician_id -> ordered job ids

function routeStats(
  tech: Technician,
  jobIds: string[],
  jobsById: Map<string, FieldJob>,
  matrix: MatrixResult,
  indexOf: Map<string, number>
) {
  let clock = tech.shift_start_hour * 60;
  let travel = 0;
  let windowViolations = 0;
  let skillViolations = 0;
  const arrivals = new Map<string, number>();
  let fromIndex = indexOf.get(`tech:${tech.id}`)!;

  for (const jobId of jobIds) {
    const job = jobsById.get(jobId)!;
    if (job.required_skill && !tech.skills.includes(job.required_skill)) skillViolations++;
    const toIndex = indexOf.get(`job:${jobId}`)!;
    clock += matrix.durationMinutes[fromIndex][toIndex];
    travel += matrix.durationMinutes[fromIndex][toIndex];
    const windowStartMin = job.window_start_hour * 60;
    const windowEndMin = job.window_end_hour * 60;
    if (clock < windowStartMin) clock = windowStartMin; // arrived early, wait
    if (clock > windowEndMin) windowViolations++;
    arrivals.set(jobId, clock / 60);
    clock += job.duration_minutes;
    fromIndex = toIndex;
  }

  return { finishHour: clock / 60, travelMinutes: travel, arrivals, windowViolations, skillViolations };
}

function scoreOf(plan: Plan, jobs: FieldJob[], technicians: Technician[], matrix: MatrixResult, indexOf: Map<string, number>) {
  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  const assignedIds = new Set<string>();
  let hard = 0;
  let soft = 0;
  let totalTravel = 0;

  for (const tech of technicians) {
    const route = plan.get(tech.id) ?? [];
    for (const id of route) assignedIds.add(id);
    const stats = routeStats(tech, route, jobsById, matrix, indexOf);
    hard -= stats.windowViolations; // H2
    hard -= stats.skillViolations; // H1
    if (stats.finishHour > tech.shift_end_hour) hard -= Math.ceil((stats.finishHour - tech.shift_end_hour) * 6); // H3
    totalTravel += stats.travelMinutes;
  }

  for (const job of jobs) {
    if (!assignedIds.has(job.id)) soft -= 30 * (6 - job.priority); // S1
  }
  soft -= Math.round(totalTravel); // S2, 1 point per minute of drive time

  return { hard, soft, totalTravel };
}

function better(a: { hard: number; soft: number }, b: { hard: number; soft: number }) {
  return a.hard > b.hard || (a.hard === b.hard && a.soft > b.soft);
}

function analyze(plan: Plan, jobs: FieldJob[], technicians: Technician[], matrix: MatrixResult, indexOf: Map<string, number>) {
  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  let h1 = 0,
    h2 = 0,
    h3 = 0,
    unassigned = 0,
    onTime = 0,
    totalTravel = 0;
  const assignedIds = new Set<string>();

  for (const tech of technicians) {
    const route = plan.get(tech.id) ?? [];
    for (const id of route) assignedIds.add(id);
    const stats = routeStats(tech, route, jobsById, matrix, indexOf);
    h1 += stats.skillViolations;
    h2 += stats.windowViolations;
    if (stats.finishHour > tech.shift_end_hour) h3 += Math.ceil(stats.finishHour - tech.shift_end_hour);
    onTime += route.length - stats.windowViolations;
    totalTravel += stats.travelMinutes;
  }

  for (const job of jobs) if (!assignedIds.has(job.id)) unassigned++;

  const coverage = jobs.length > 0 ? Math.round(((jobs.length - unassigned) / jobs.length) * 100) : 100;
  const assignedCount = jobs.length - unassigned;
  const onTimeRate = assignedCount > 0 ? Math.round((onTime / assignedCount) * 100) : 100;

  const breakdown: FieldConstraintBreakdown[] = [
    { code: "H1", label: "Skill mismatch", severity: "hard", count: h1, impact: -h1 },
    { code: "H2", label: "Time-window violation", severity: "hard", count: h2, impact: -h2 },
    { code: "H3", label: "Shift overrun (hours)", severity: "hard", count: h3, impact: -h3 },
    { code: "S1", label: "Unassigned jobs", severity: "soft", count: unassigned, impact: -unassigned * 30 },
    { code: "S2", label: "Total drive time (minutes)", severity: "soft", count: Math.round(totalTravel), impact: -Math.round(totalTravel) },
  ];

  return { breakdown, metrics: { coverage, onTimeRate, totalDriveMinutes: Math.round(totalTravel) } };
}

/**
 * Builds the technician/job routing plan. `timeMs` bounds the local-search
 * phase so a solve always returns promptly even for larger datasets.
 */
export async function solveFieldService(
  technicians: Technician[],
  jobs: FieldJob[],
  timeMs = 900
): Promise<FieldSolveResult> {
  const points: LatLng[] = [];
  const indexOf = new Map<string, number>();
  for (const t of technicians) {
    indexOf.set(`tech:${t.id}`, points.length);
    points.push({ lat: t.start_lat, lng: t.start_lng });
  }
  for (const j of jobs) {
    indexOf.set(`job:${j.id}`, points.length);
    points.push({ lat: j.lat, lng: j.lng });
  }
  const matrix = await getDistanceMatrix(points);
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  const plan: Plan = new Map(technicians.map((t) => [t.id, [] as string[]]));

  // --- Construction: cheapest feasible insertion, highest priority first ---
  for (const job of [...jobs].sort((a, b) => a.priority - b.priority)) {
    let bestTech: string | null = null;
    let bestPos = 0;
    let bestDelta = Infinity;
    let bestFeasible = false;

    for (const tech of technicians) {
      if (job.required_skill && !tech.skills.includes(job.required_skill)) continue;
      const route = plan.get(tech.id)!;
      for (let pos = 0; pos <= route.length; pos++) {
        const trial = [...route.slice(0, pos), job.id, ...route.slice(pos)];
        const before = routeStats(tech, route, jobsById, matrix, indexOf);
        const after = routeStats(tech, trial, jobsById, matrix, indexOf);
        const feasible = after.windowViolations === 0 && after.finishHour <= tech.shift_end_hour;
        const delta = after.travelMinutes - before.travelMinutes;
        const isBetter = (feasible && !bestFeasible) || (feasible === bestFeasible && delta < bestDelta);
        if (isBetter) {
          bestFeasible = feasible;
          bestDelta = delta;
          bestTech = tech.id;
          bestPos = pos;
        }
      }
    }
    if (bestTech) {
      const route = plan.get(bestTech)!;
      route.splice(bestPos, 0, job.id);
    }
  }

  // --- Local search: relocate a random job to a random technician/position ---
  let current = scoreOf(plan, jobs, technicians, matrix, indexOf);
  let best = current;
  let bestPlan: Plan = new Map([...plan].map(([k, v]) => [k, [...v]]));
  const lateSize = 30;
  const late: { hard: number; soft: number }[] = Array(lateSize).fill(current);
  const start = Date.now();
  let iter = 0;

  while (Date.now() - start < timeMs && jobs.length > 0 && technicians.length > 0) {
    iter++;
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    let ownerTech: string | null = null;
    let ownerIdx = -1;
    for (const [techId, route] of plan) {
      const idx = route.indexOf(job.id);
      if (idx >= 0) {
        ownerTech = techId;
        ownerIdx = idx;
        break;
      }
    }
    const removeOnly = Math.random() < 0.15;
    const targetTech = technicians[Math.floor(Math.random() * technicians.length)];
    const targetRoute = plan.get(targetTech.id)!;
    const targetPos = Math.floor(Math.random() * (targetRoute.length + 1));

    if (ownerTech !== null) plan.get(ownerTech)!.splice(ownerIdx, 1);
    if (!removeOnly) targetRoute.splice(targetPos, 0, job.id);

    const cand = scoreOf(plan, jobs, technicians, matrix, indexOf);
    const lateVal = late[iter % lateSize];
    if (better(cand, current) || cand.hard > lateVal.hard || (cand.hard === lateVal.hard && cand.soft >= lateVal.soft)) {
      current = cand;
      if (better(cand, best)) {
        best = cand;
        bestPlan = new Map([...plan].map(([k, v]) => [k, [...v]]));
      }
    } else {
      // revert
      if (!removeOnly) {
        const idx = targetRoute.indexOf(job.id);
        if (idx >= 0) targetRoute.splice(idx, 1);
      }
      if (ownerTech !== null) plan.get(ownerTech)!.splice(ownerIdx, 0, job.id);
    }
    late[iter % lateSize] = current;
  }

  const { breakdown, metrics } = analyze(bestPlan, jobs, technicians, matrix, indexOf);

  const explanation: string[] = [];
  explanation.push(
    best.hard === 0
      ? "Feasible: all skill, time-window and shift constraints satisfied."
      : `${-best.hard} hard constraint violation(s) remain — add technicians, skills or widen time windows.`
  );
  const assignedIds = new Set([...bestPlan.values()].flat());
  const unassigned = jobs.filter((j) => !assignedIds.has(j.id)).length;
  if (unassigned > 0) explanation.push(`${unassigned} job(s) could not be assigned.`);
  explanation.push(`Total drive time ${Math.round(metrics.totalDriveMinutes)} min across ${technicians.length} technician(s) after ${iter.toLocaleString()} local-search moves.`);
  if (matrix.source === "estimated") {
    explanation.push("Drive times are straight-line estimates — set GOOGLE_MAPS_API_KEY for real road distances.");
  }

  const assignments: FieldAssignment[] = jobs.map((job) => {
    for (const [techId, route] of bestPlan) {
      const idx = route.indexOf(job.id);
      if (idx >= 0) {
        const tech = technicians.find((t) => t.id === techId)!;
        const stats = routeStats(tech, route, jobsById, matrix, indexOf);
        return {
          job_id: job.id,
          technician_id: techId,
          sequence: idx,
          eta_hour: stats.arrivals.get(job.id) ?? null,
        };
      }
    }
    return { job_id: job.id, technician_id: null, sequence: null, eta_hour: null };
  });

  return {
    assignments,
    score: { hard: best.hard, soft: best.soft },
    explanation,
    breakdown,
    metrics: { ...metrics, distanceSource: matrix.source },
  };
}
