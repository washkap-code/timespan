/**
 * TimeSpan task-scheduling solver — the Task Scheduling API vertical.
 *
 * Same construction-heuristic + late-acceptance local-search approach as the
 * shift solver (src/lib/solver/solver.ts), applied to a different domain:
 * assigning jobs with dependencies and priorities to resources across a
 * planning window of days.
 *
 * Hard constraints:
 *  H1  Required skill must be present on the assigned resource.
 *  H2  Dependency ordering: a job's dependencies must be assigned to a
 *      strictly earlier day than the job itself.
 *  H3  Resource day-capacity: total assigned hours on a resource for a given
 *      day must not exceed that resource's capacity_hours_per_day.
 *
 * Soft constraints:
 *  S1  Unassigned jobs (heavily penalized).
 *  S2  Priority-weighted tardiness: jobs scheduled later than their target
 *      day are penalized proportional to priority × days late.
 *  S3  Resource load fairness: minimize variance of hours assigned per resource.
 */

export interface TaskResource {
  id: string;
  name: string;
  skills: string[];
  capacity_hours_per_day: number;
}

export interface Job {
  id: string;
  label: string;
  target_day: number; // 0=Mon .. 6=Sun — the day this job is ideally scheduled
  duration_hours: number;
  priority: number; // 1 (highest) .. 5 (lowest)
  required_skill: string | null;
  depends_on: string[]; // job ids
}

export interface JobAssignment {
  job_id: string;
  resource_id: string | null;
  assigned_day: number | null;
}

export interface TaskConstraintBreakdown {
  code: string;
  label: string;
  severity: "hard" | "soft";
  count: number;
  impact: number;
}

export interface TaskSolveMetrics {
  coverage: number;
  onTimeRate: number; // % of assigned jobs at or before target day
  utilization: number;
}

export interface TaskSolveResult {
  assignments: JobAssignment[];
  score: { hard: number; soft: number };
  explanation: string[];
  breakdown: TaskConstraintBreakdown[];
  metrics: TaskSolveMetrics;
}

type Plan = Map<string, { resource: string | null; day: number | null }>;

function topoOrder(jobs: Job[]): Job[] {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const visited = new Set<string>();
  const order: Job[] = [];
  function visit(job: Job, stack: Set<string>) {
    if (visited.has(job.id) || stack.has(job.id)) return;
    stack.add(job.id);
    for (const depId of job.depends_on) {
      const dep = byId.get(depId);
      if (dep) visit(dep, stack);
    }
    stack.delete(job.id);
    visited.add(job.id);
    order.push(job);
  }
  // Higher priority (lower number) first among independent jobs.
  for (const job of [...jobs].sort((a, b) => a.priority - b.priority)) visit(job, new Set());
  return order;
}

function scoreOf(plan: Plan, jobs: Job[], resources: TaskResource[]) {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const resById = new Map(resources.map((r) => [r.id, r]));
  let hard = 0;
  let soft = 0;

  const hoursByResourceDay = new Map<string, number>();
  const hoursByResource = new Map<string, number>();

  for (const [jobId, { resource, day }] of plan) {
    const job = jobById.get(jobId)!;
    if (!resource || day === null) {
      soft -= 20; // S1 unassigned
      continue;
    }
    const res = resById.get(resource);
    if (!res) continue;

    if (job.required_skill && !res.skills.includes(job.required_skill)) hard -= 1; // H1

    for (const depId of job.depends_on) {
      const dep = plan.get(depId);
      if (!dep || dep.day === null || dep.day >= day) hard -= 1; // H2
    }

    const key = `${resource}:${day}`;
    hoursByResourceDay.set(key, (hoursByResourceDay.get(key) ?? 0) + job.duration_hours);
    hoursByResource.set(resource, (hoursByResource.get(resource) ?? 0) + job.duration_hours);

    if (day > job.target_day) soft -= (day - job.target_day) * (6 - job.priority); // S2 tardiness
  }

  for (const [key, hours] of hoursByResourceDay) {
    const resourceId = key.split(":")[0];
    const res = resById.get(resourceId);
    if (res && hours > res.capacity_hours_per_day) hard -= Math.ceil(hours - res.capacity_hours_per_day); // H3
  }

  if (resources.length > 0) {
    const totalHours = [...hoursByResource.values()].reduce((a, b) => a + b, 0);
    const mean = totalHours / resources.length;
    for (const r of resources) {
      const h = hoursByResource.get(r.id) ?? 0;
      soft -= Math.round(Math.abs(h - mean) ** 2 * 0.1); // S3 fairness
    }
  }

  return { hard, soft };
}

function better(a: { hard: number; soft: number }, b: { hard: number; soft: number }) {
  return a.hard > b.hard || (a.hard === b.hard && a.soft > b.soft);
}

function analyze(plan: Plan, jobs: Job[], resources: TaskResource[]) {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const resById = new Map(resources.map((r) => [r.id, r]));

  let h1 = 0,
    h2 = 0,
    h3 = 0,
    unassigned = 0,
    tardySum = 0,
    onTime = 0;
  const hoursByResourceDay = new Map<string, number>();
  const hoursByResource = new Map<string, number>();

  for (const [jobId, { resource, day }] of plan) {
    const job = jobById.get(jobId)!;
    if (!resource || day === null) {
      unassigned++;
      continue;
    }
    const res = resById.get(resource);
    if (!res) continue;
    if (job.required_skill && !res.skills.includes(job.required_skill)) h1++;
    for (const depId of job.depends_on) {
      const dep = plan.get(depId);
      if (!dep || dep.day === null || dep.day >= day) h2++;
    }
    const key = `${resource}:${day}`;
    hoursByResourceDay.set(key, (hoursByResourceDay.get(key) ?? 0) + job.duration_hours);
    hoursByResource.set(resource, (hoursByResource.get(resource) ?? 0) + job.duration_hours);
    if (day > job.target_day) tardySum += day - job.target_day;
    else onTime++;
  }

  for (const [key, hours] of hoursByResourceDay) {
    const resourceId = key.split(":")[0];
    const res = resById.get(resourceId);
    if (res && hours > res.capacity_hours_per_day) h3 += Math.ceil(hours - res.capacity_hours_per_day);
  }

  const totalCapacity = resources.reduce((sum, r) => sum + r.capacity_hours_per_day * 7, 0);
  const totalAssignedHours = [...hoursByResource.values()].reduce((a, b) => a + b, 0);
  const coverage = jobs.length > 0 ? Math.round(((jobs.length - unassigned) / jobs.length) * 100) : 100;
  const assignedCount = jobs.length - unassigned;
  const onTimeRate = assignedCount > 0 ? Math.round((onTime / assignedCount) * 100) : 100;
  const utilization = totalCapacity > 0 ? Math.round((totalAssignedHours / totalCapacity) * 100) : 0;

  const breakdown: TaskConstraintBreakdown[] = [
    { code: "H1", label: "Skill mismatch", severity: "hard", count: h1, impact: -h1 },
    { code: "H2", label: "Dependency ordering violation", severity: "hard", count: h2, impact: -h2 },
    { code: "H3", label: "Resource over-capacity", severity: "hard", count: h3, impact: -h3 },
    { code: "S1", label: "Unassigned jobs", severity: "soft", count: unassigned, impact: -unassigned * 20 },
    { code: "S2", label: "Priority-weighted tardiness (days late, summed)", severity: "soft", count: tardySum, impact: -tardySum },
    { code: "S3", label: "Resource load imbalance", severity: "soft", count: 0, impact: 0 },
  ];

  return { breakdown, metrics: { coverage, onTimeRate, utilization } };
}

export function solveTasks(resources: TaskResource[], jobs: Job[], timeMs = 900): TaskSolveResult {
  const ordered = topoOrder(jobs);
  const plan: Plan = new Map();

  // --- Construction: process in dependency-safe, priority order ---
  for (const job of ordered) {
    let best: { resource: string; day: number } | null = null;
    let bestScore = { hard: -Infinity, soft: -Infinity };
    for (const res of resources) {
      for (let day = 0; day <= 6; day++) {
        plan.set(job.id, { resource: res.id, day });
        const s = scoreOf(plan, jobs, resources);
        if (better(s, bestScore)) {
          bestScore = s;
          best = { resource: res.id, day };
        }
      }
    }
    plan.set(job.id, best ? { resource: best.resource, day: best.day } : { resource: null, day: null });
  }

  // --- Local search ---
  let current = scoreOf(plan, jobs, resources);
  let best = current;
  let bestPlan: Plan = new Map(plan);
  const lateSize = 40;
  const late: { hard: number; soft: number }[] = Array(lateSize).fill(current);
  const start = Date.now();
  let iter = 0;

  while (Date.now() - start < timeMs && jobs.length > 0 && resources.length > 0) {
    iter++;
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const prev = plan.get(job.id) ?? { resource: null, day: null };
    const pickResource = Math.random() < 0.1 ? null : resources[Math.floor(Math.random() * resources.length)].id;
    const pickDay = pickResource === null ? null : Math.floor(Math.random() * 7);
    if (pickResource === prev.resource && pickDay === prev.day) continue;
    plan.set(job.id, { resource: pickResource, day: pickDay });
    const cand = scoreOf(plan, jobs, resources);
    const lateVal = late[iter % lateSize];
    if (better(cand, current) || cand.hard > lateVal.hard || (cand.hard === lateVal.hard && cand.soft >= lateVal.soft)) {
      current = cand;
      if (better(cand, best)) {
        best = cand;
        bestPlan = new Map(plan);
      }
    } else {
      plan.set(job.id, prev);
    }
    late[iter % lateSize] = current;
  }

  const { breakdown, metrics } = analyze(bestPlan, jobs, resources);

  const explanation: string[] = [];
  explanation.push(
    best.hard === 0
      ? "Feasible: all hard constraints (skills, dependency order, resource capacity) satisfied."
      : `${-best.hard} hard constraint violation(s) remain — add resources, skills or capacity.`
  );
  const unassigned = [...bestPlan.values()].filter((v) => v.resource === null).length;
  if (unassigned > 0) explanation.push(`${unassigned} job(s) could not be assigned.`);
  explanation.push(`Soft score ${best.soft} after ${iter.toLocaleString()} local-search moves.`);

  return {
    assignments: jobs.map((j) => {
      const a = bestPlan.get(j.id) ?? { resource: null, day: null };
      return { job_id: j.id, resource_id: a.resource, assigned_day: a.day };
    }),
    score: best,
    explanation,
    breakdown,
    metrics,
  };
}
