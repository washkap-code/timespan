/**
 * TimeSpan pickup & delivery routing solver — the Pickup & Delivery Routing
 * API vertical (a classic VRPPD: vehicle routing with pickup-delivery pairs,
 * capacity, and time windows).
 *
 * Same construction + late-acceptance local-search family as the other
 * solvers, applied to route sequencing over pickup/delivery *stops* rather
 * than single-visit jobs. Each job contributes two stops to a vehicle's
 * route — a pickup and a delivery — and the pickup must occur before its
 * delivery on the same vehicle.
 *
 * Hard constraints:
 *  H1  Precedence: a job's pickup stop must precede its delivery stop on the
 *      same vehicle's route (enforced by construction; checked defensively).
 *  H2  Capacity: running load on a vehicle must never exceed its capacity.
 *  H3  Time-window violation: arrival at a pickup/delivery after its window
 *      end, or a vehicle finishing after its shift end.
 *
 * Soft constraints:
 *  S1  Unassigned job pairs (heavily penalized, weighted by priority).
 *  S2  Total drive time across all routes (minimized).
 */

import { getDistanceMatrix, type LatLng, type MatrixResult } from "@/lib/maps/distance-matrix";

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  start_lat: number;
  start_lng: number;
  shift_start_hour: number;
  shift_end_hour: number;
}

export interface DeliveryJob {
  id: string;
  label: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  demand: number;
  pickup_window_start_hour: number;
  pickup_window_end_hour: number;
  delivery_window_start_hour: number;
  delivery_window_end_hour: number;
  priority: number; // 1 (highest) .. 5 (lowest)
}

type StopKind = "pickup" | "delivery";
interface Stop {
  jobId: string;
  kind: StopKind;
}

export interface DeliveryAssignment {
  job_id: string;
  vehicle_id: string | null;
  pickup_sequence: number | null;
  delivery_sequence: number | null;
  pickup_eta_hour: number | null;
  delivery_eta_hour: number | null;
}

export interface DeliveryConstraintBreakdown {
  code: string;
  label: string;
  severity: "hard" | "soft";
  count: number;
  impact: number;
}

export interface DeliverySolveMetrics {
  coverage: number;
  onTimeRate: number;
  totalDriveMinutes: number;
  distanceSource: "google" | "estimated";
}

export interface DeliverySolveResult {
  assignments: DeliveryAssignment[];
  score: { hard: number; soft: number };
  explanation: string[];
  breakdown: DeliveryConstraintBreakdown[];
  metrics: DeliverySolveMetrics;
}

type Plan = Map<string, Stop[]>; // vehicle_id -> ordered stops

function stopIndexKey(stop: Stop) {
  return `${stop.kind}:${stop.jobId}`;
}

function routeStats(
  vehicle: Vehicle,
  stops: Stop[],
  jobsById: Map<string, DeliveryJob>,
  matrix: MatrixResult,
  indexOf: Map<string, number>
) {
  let clock = vehicle.shift_start_hour * 60;
  let travel = 0;
  let load = 0;
  let capacityViolations = 0;
  let windowViolations = 0;
  let precedenceViolations = 0;
  const seenPickup = new Set<string>();
  const arrivals = new Map<string, number>(); // stopIndexKey -> hour

  let fromIndex = indexOf.get(`vehicle:${vehicle.id}`)!;
  for (const stop of stops) {
    const job = jobsById.get(stop.jobId)!;
    const toIndex = indexOf.get(stopIndexKey(stop))!;
    clock += matrix.durationMinutes[fromIndex][toIndex];
    travel += matrix.durationMinutes[fromIndex][toIndex];

    if (stop.kind === "pickup") {
      seenPickup.add(stop.jobId);
      load += job.demand;
      if (load > vehicle.capacity) capacityViolations++;
      const ws = job.pickup_window_start_hour * 60;
      const we = job.pickup_window_end_hour * 60;
      if (clock < ws) clock = ws;
      if (clock > we) windowViolations++;
    } else {
      if (!seenPickup.has(stop.jobId)) precedenceViolations++;
      load -= job.demand;
      const ws = job.delivery_window_start_hour * 60;
      const we = job.delivery_window_end_hour * 60;
      if (clock < ws) clock = ws;
      if (clock > we) windowViolations++;
    }
    arrivals.set(stopIndexKey(stop), clock / 60);
    fromIndex = toIndex;
  }

  return { finishHour: clock / 60, travelMinutes: travel, capacityViolations, windowViolations, precedenceViolations, arrivals };
}

function scoreOf(plan: Plan, jobs: DeliveryJob[], vehicles: Vehicle[], matrix: MatrixResult, indexOf: Map<string, number>) {
  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  const assignedIds = new Set<string>();
  let hard = 0;
  let soft = 0;
  let totalTravel = 0;

  for (const vehicle of vehicles) {
    const stops = plan.get(vehicle.id) ?? [];
    for (const s of stops) assignedIds.add(s.jobId);
    const stats = routeStats(vehicle, stops, jobsById, matrix, indexOf);
    hard -= stats.precedenceViolations * 5; // H1
    hard -= stats.capacityViolations; // H2
    hard -= stats.windowViolations; // H3
    if (stats.finishHour > vehicle.shift_end_hour) hard -= Math.ceil((stats.finishHour - vehicle.shift_end_hour) * 6); // H3 (shift overrun)
    totalTravel += stats.travelMinutes;
  }

  for (const job of jobs) if (!assignedIds.has(job.id)) soft -= 30 * (6 - job.priority); // S1
  soft -= Math.round(totalTravel); // S2

  return { hard, soft, totalTravel };
}

function better(a: { hard: number; soft: number }, b: { hard: number; soft: number }) {
  return a.hard > b.hard || (a.hard === b.hard && a.soft > b.soft);
}

function analyze(plan: Plan, jobs: DeliveryJob[], vehicles: Vehicle[], matrix: MatrixResult, indexOf: Map<string, number>) {
  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  let h1 = 0,
    h2 = 0,
    h3 = 0,
    unassigned = 0,
    onTimeStops = 0,
    totalStops = 0,
    totalTravel = 0;
  const assignedIds = new Set<string>();

  for (const vehicle of vehicles) {
    const stops = plan.get(vehicle.id) ?? [];
    for (const s of stops) assignedIds.add(s.jobId);
    const stats = routeStats(vehicle, stops, jobsById, matrix, indexOf);
    h1 += stats.precedenceViolations;
    h2 += stats.capacityViolations;
    let overrun = stats.windowViolations;
    if (stats.finishHour > vehicle.shift_end_hour) overrun += Math.ceil(stats.finishHour - vehicle.shift_end_hour);
    h3 += overrun;
    totalStops += stops.length;
    onTimeStops += stops.length - stats.windowViolations;
    totalTravel += stats.travelMinutes;
  }

  for (const job of jobs) if (!assignedIds.has(job.id)) unassigned++;

  const coverage = jobs.length > 0 ? Math.round(((jobs.length - unassigned) / jobs.length) * 100) : 100;
  const onTimeRate = totalStops > 0 ? Math.round((onTimeStops / totalStops) * 100) : 100;

  const breakdown: DeliveryConstraintBreakdown[] = [
    { code: "H1", label: "Pickup/delivery precedence violation", severity: "hard", count: h1, impact: -h1 * 5 },
    { code: "H2", label: "Vehicle capacity exceeded", severity: "hard", count: h2, impact: -h2 },
    { code: "H3", label: "Time-window or shift overrun", severity: "hard", count: h3, impact: -h3 },
    { code: "S1", label: "Unassigned job pairs", severity: "soft", count: unassigned, impact: -unassigned * 30 },
    { code: "S2", label: "Total drive time (minutes)", severity: "soft", count: Math.round(totalTravel), impact: -Math.round(totalTravel) },
  ];

  return { breakdown, metrics: { coverage, onTimeRate, totalDriveMinutes: Math.round(totalTravel) } };
}

function tryInsertPair(
  vehicle: Vehicle,
  route: Stop[],
  job: DeliveryJob,
  jobsById: Map<string, DeliveryJob>,
  matrix: MatrixResult,
  indexOf: Map<string, number>
) {
  let bestRoute: Stop[] | null = null;
  let bestDelta = Infinity;
  let bestFeasible = false;
  const before = routeStats(vehicle, route, jobsById, matrix, indexOf);

  for (let pi = 0; pi <= route.length; pi++) {
    for (let di = pi; di <= route.length; di++) {
      const trial = [...route.slice(0, pi), { jobId: job.id, kind: "pickup" as StopKind }, ...route.slice(pi, di), { jobId: job.id, kind: "delivery" as StopKind }, ...route.slice(di)];
      const after = routeStats(vehicle, trial, jobsById, matrix, indexOf);
      const feasible =
        after.capacityViolations === 0 && after.windowViolations === 0 && after.finishHour <= vehicle.shift_end_hour;
      const delta = after.travelMinutes - before.travelMinutes;
      const isBetter = (feasible && !bestFeasible) || (feasible === bestFeasible && delta < bestDelta);
      if (isBetter) {
        bestFeasible = feasible;
        bestDelta = delta;
        bestRoute = trial;
      }
    }
  }
  return bestRoute;
}

/**
 * Builds the vehicle routing plan for pickup & delivery job pairs. `timeMs`
 * bounds the local-search phase so a solve always returns promptly.
 */
export async function solvePickupDelivery(
  vehicles: Vehicle[],
  jobs: DeliveryJob[],
  timeMs = 900
): Promise<DeliverySolveResult> {
  const points: LatLng[] = [];
  const indexOf = new Map<string, number>();
  for (const v of vehicles) {
    indexOf.set(`vehicle:${v.id}`, points.length);
    points.push({ lat: v.start_lat, lng: v.start_lng });
  }
  for (const j of jobs) {
    indexOf.set(`pickup:${j.id}`, points.length);
    points.push({ lat: j.pickup_lat, lng: j.pickup_lng });
    indexOf.set(`delivery:${j.id}`, points.length);
    points.push({ lat: j.delivery_lat, lng: j.delivery_lng });
  }
  const matrix = await getDistanceMatrix(points);
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  const plan: Plan = new Map(vehicles.map((v) => [v.id, [] as Stop[]]));

  // --- Construction: cheapest feasible pair insertion, highest priority first ---
  for (const job of [...jobs].sort((a, b) => a.priority - b.priority)) {
    let bestVehicle: string | null = null;
    let bestRoute: Stop[] | null = null;
    let bestDelta = Infinity;

    for (const vehicle of vehicles) {
      if (job.demand > vehicle.capacity) continue;
      const route = plan.get(vehicle.id)!;
      const candidate = tryInsertPair(vehicle, route, job, jobsById, matrix, indexOf);
      if (candidate) {
        const before = routeStats(vehicle, route, jobsById, matrix, indexOf).travelMinutes;
        const after = routeStats(vehicle, candidate, jobsById, matrix, indexOf).travelMinutes;
        const delta = after - before;
        if (delta < bestDelta) {
          bestDelta = delta;
          bestVehicle = vehicle.id;
          bestRoute = candidate;
        }
      }
    }
    if (bestVehicle && bestRoute) plan.set(bestVehicle, bestRoute);
  }

  // --- Local search: relocate a random job pair to a random vehicle ---
  let current = scoreOf(plan, jobs, vehicles, matrix, indexOf);
  let best = current;
  let bestPlan: Plan = new Map([...plan].map(([k, v]) => [k, [...v]]));
  const lateSize = 30;
  const late: { hard: number; soft: number }[] = Array(lateSize).fill(current);
  const start = Date.now();
  let iter = 0;

  while (Date.now() - start < timeMs && jobs.length > 0 && vehicles.length > 0) {
    iter++;
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    let ownerVehicle: string | null = null;
    for (const [vid, stops] of plan) {
      if (stops.some((s) => s.jobId === job.id)) {
        ownerVehicle = vid;
        break;
      }
    }
    const savedOwnerRoute = ownerVehicle ? [...plan.get(ownerVehicle)!] : null;
    if (ownerVehicle) plan.set(ownerVehicle, plan.get(ownerVehicle)!.filter((s) => s.jobId !== job.id));

    const removeOnly = Math.random() < 0.15;
    let inserted = false;
    if (!removeOnly) {
      const targetVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      if (job.demand <= targetVehicle.capacity) {
        const route = plan.get(targetVehicle.id)!;
        const pi = Math.floor(Math.random() * (route.length + 1));
        const di = pi + Math.floor(Math.random() * (route.length - pi + 1));
        const trial = [...route.slice(0, pi), { jobId: job.id, kind: "pickup" as StopKind }, ...route.slice(pi, di), { jobId: job.id, kind: "delivery" as StopKind }, ...route.slice(di)];
        plan.set(targetVehicle.id, trial);
        inserted = true;
      }
    }

    const cand = scoreOf(plan, jobs, vehicles, matrix, indexOf);
    const lateVal = late[iter % lateSize];
    if (better(cand, current) || cand.hard > lateVal.hard || (cand.hard === lateVal.hard && cand.soft >= lateVal.soft)) {
      current = cand;
      if (better(cand, best)) {
        best = cand;
        bestPlan = new Map([...plan].map(([k, v]) => [k, [...v]]));
      }
    } else {
      // revert: strip the job out of wherever it landed, restore its old route
      if (inserted) {
        for (const [vid, stops] of plan) plan.set(vid, stops.filter((s) => s.jobId !== job.id));
      }
      if (ownerVehicle && savedOwnerRoute) plan.set(ownerVehicle, savedOwnerRoute);
    }
    late[iter % lateSize] = current;
  }

  const { breakdown, metrics } = analyze(bestPlan, jobs, vehicles, matrix, indexOf);

  const explanation: string[] = [];
  explanation.push(
    best.hard === 0
      ? "Feasible: all precedence, capacity and time-window constraints satisfied."
      : `${-best.hard} hard constraint violation(s) remain — add vehicles, capacity or widen time windows.`
  );
  const assignedIds = new Set([...bestPlan.values()].flatMap((stops) => stops.map((s) => s.jobId)));
  const unassigned = jobs.filter((j) => !assignedIds.has(j.id)).length;
  if (unassigned > 0) explanation.push(`${unassigned} job pair(s) could not be assigned.`);
  explanation.push(`Total drive time ${Math.round(metrics.totalDriveMinutes)} min across ${vehicles.length} vehicle(s) after ${iter.toLocaleString()} local-search moves.`);
  if (matrix.source === "estimated") {
    explanation.push("Drive times are straight-line estimates — set GOOGLE_MAPS_API_KEY for real road distances.");
  }

  const assignments: DeliveryAssignment[] = jobs.map((job) => {
    for (const [vehicleId, stops] of bestPlan) {
      const pickupIdx = stops.findIndex((s) => s.jobId === job.id && s.kind === "pickup");
      const deliveryIdx = stops.findIndex((s) => s.jobId === job.id && s.kind === "delivery");
      if (pickupIdx >= 0) {
        const vehicle = vehicles.find((v) => v.id === vehicleId)!;
        const stats = routeStats(vehicle, stops, jobsById, matrix, indexOf);
        return {
          job_id: job.id,
          vehicle_id: vehicleId,
          pickup_sequence: pickupIdx,
          delivery_sequence: deliveryIdx,
          pickup_eta_hour: stats.arrivals.get(`pickup:${job.id}`) ?? null,
          delivery_eta_hour: stats.arrivals.get(`delivery:${job.id}`) ?? null,
        };
      }
    }
    return { job_id: job.id, vehicle_id: null, pickup_sequence: null, delivery_sequence: null, pickup_eta_hour: null, delivery_eta_hour: null };
  });

  return {
    assignments,
    score: { hard: best.hard, soft: best.soft },
    explanation,
    breakdown,
    metrics: { ...metrics, distanceSource: matrix.source },
  };
}
