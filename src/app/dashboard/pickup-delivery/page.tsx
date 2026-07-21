"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, DeliveryJob, DeliveryAssignment, DeliveryConstraintBreakdown, DeliverySolveMetrics } from "@/lib/solver/pickup-delivery-solver";

const DEMO_VEHICLES = [
  { name: "Van 1", capacity: 12, start_lat: 51.5074, start_lng: -0.1278, shift_start_hour: 8, shift_end_hour: 17 },
  { name: "Van 2", capacity: 8, start_lat: 51.49, start_lng: -0.15, shift_start_hour: 9, shift_end_hour: 18 },
];

const DEMO_JOBS = [
  { label: "Parcel #1 — Warehouse to Riverside Office", pickup_lat: 51.5, pickup_lng: -0.1, delivery_lat: 51.505, delivery_lng: -0.11, demand: 2, pickup_window_start_hour: 8, pickup_window_end_hour: 11, delivery_window_start_hour: 9, delivery_window_end_hour: 14, priority: 1 },
  { label: "Parcel #2 — Warehouse to Kings Cross", pickup_lat: 51.5, pickup_lng: -0.1, delivery_lat: 51.53, delivery_lng: -0.12, demand: 3, pickup_window_start_hour: 8, pickup_window_end_hour: 12, delivery_window_start_hour: 10, delivery_window_end_hour: 15, priority: 2 },
  { label: "Parcel #3 — Depot to Canary Wharf", pickup_lat: 51.49, pickup_lng: -0.15, delivery_lat: 51.505, delivery_lng: -0.02, demand: 4, pickup_window_start_hour: 9, pickup_window_end_hour: 12, delivery_window_start_hour: 11, delivery_window_end_hour: 17, priority: 3 },
  { label: "Parcel #4 — Warehouse to Shoreditch", pickup_lat: 51.5, pickup_lng: -0.1, delivery_lat: 51.525, delivery_lng: -0.078, demand: 2, pickup_window_start_hour: 8, pickup_window_end_hour: 11, delivery_window_start_hour: 9, delivery_window_end_hour: 13, priority: 1 },
  { label: "Parcel #5 — Depot to Camden", pickup_lat: 51.49, pickup_lng: -0.15, delivery_lat: 51.54, delivery_lng: -0.14, demand: 5, pickup_window_start_hour: 9, pickup_window_end_hour: 13, delivery_window_start_hour: 11, delivery_window_end_hour: 18, priority: 2 },
];

interface RunResult {
  score: { hard: number; soft: number };
  metrics: DeliverySolveMetrics;
  breakdown: DeliveryConstraintBreakdown[];
}

export default function PickupDeliveryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: v }, { data: j }] = await Promise.all([
      supabase.from("pd_vehicles").select("id,name,capacity,start_lat,start_lng,shift_start_hour,shift_end_hour").order("name"),
      supabase
        .from("pd_jobs")
        .select(
          "id,label,pickup_lat,pickup_lng,delivery_lat,delivery_lng,demand,pickup_window_start_hour,pickup_window_end_hour,delivery_window_start_hour,delivery_window_end_hour,priority"
        )
        .order("priority"),
    ]);
    setVehicles((v as Vehicle[]) ?? []);
    setJobs((j as DeliveryJob[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function seedDemo() {
    setBusy("Loading demo network…");
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    await supabase.from("pd_jobs").delete().neq("priority", -1);
    await supabase.from("pd_vehicles").delete().neq("capacity", -1);
    const { error: e1 } = await supabase.from("pd_vehicles").insert(DEMO_VEHICLES.map((v) => ({ ...v, user_id: uid })));
    const { error: e2 } = await supabase.from("pd_jobs").insert(DEMO_JOBS.map((j) => ({ ...j, user_id: uid })));
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
      const res = await fetch("/api/solve-pickup-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Pickup & delivery run" }),
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
  const fmt = (h: number | null) => (h === null ? "—" : `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`);
  const routeFor = (vehicleId: string) =>
    assignments
      .filter((a) => a.vehicle_id === vehicleId)
      .sort((a, b) => (a.pickup_sequence ?? 0) - (b.pickup_sequence ?? 0));
  const unassigned = assignments.filter((a) => a.vehicle_id === null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pickup & Delivery Routing</h1>
          <p className="mt-1 text-sm text-muted">
            Route vehicles through pickup and delivery pairs — capacity, precedence, time windows and drive time solved together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedDemo}
            disabled={!!busy}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary-light/50 hover:bg-surface disabled:opacity-50"
          >
            Load demo network
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
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold">{v.name}</p>
            <p className="text-xs text-muted">
              capacity {v.capacity} · shift {v.shift_start_hour}:00–{v.shift_end_hour}:00
            </p>
            <div className="mt-3 space-y-2">
              {routeFor(v.id).length === 0 && <p className="text-xs text-muted">No stops assigned.</p>}
              {routeFor(v.id).map((a) => (
                <div key={a.job_id} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                  <p className="text-xs font-semibold">{jobLabel(a.job_id)}</p>
                  <p className="font-mono text-[11px] text-muted">
                    Pickup {fmt(a.pickup_eta_hour)} (#{(a.pickup_sequence ?? 0) + 1}) → Delivery {fmt(a.delivery_eta_hour)} (#{(a.delivery_sequence ?? 0) + 1})
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <p className="text-sm text-muted">No vehicles yet — load the demo network to get started.</p>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <p className="text-sm font-semibold text-destructive">Unassigned job pairs ({unassigned.length})</p>
          <ul className="mt-2 space-y-1">
            {unassigned.map((a) => (
              <li key={a.job_id} className="text-xs text-muted">{jobLabel(a.job_id)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Jobs list */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Job pairs ({jobs.length})</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{j.label}</p>
              <p className="mt-1 text-xs text-muted">
                demand {j.demand} · pickup {j.pickup_window_start_hour}:00–{j.pickup_window_end_hour}:00 · delivery {j.delivery_window_start_hour}:00–{j.delivery_window_end_hour}:00 · P{j.priority}
              </p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-muted">No job pairs yet — load the demo network to get started.</p>}
        </div>
      </div>
    </div>
  );
}
