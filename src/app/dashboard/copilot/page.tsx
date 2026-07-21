"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RunOption {
  id: string;
  vertical: "Shift Scheduling" | "Task Scheduling" | "Field Service Routing" | "Pickup & Delivery";
  name: string;
  context: Record<string, unknown>;
}

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export default function CopilotPage() {
  const [runs, setRuns] = useState<RunOption[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: schedules }, { data: taskRuns }, { data: fieldRuns }, { data: pdRuns }] = await Promise.all([
        supabase.from("schedules").select("id,name,score_hard,score_soft,constraint_breakdown,metrics").order("created_at", { ascending: false }).limit(1),
        supabase.from("task_runs").select("id,name,score_hard,score_soft,constraint_breakdown,metrics").order("created_at", { ascending: false }).limit(1),
        supabase.from("field_runs").select("id,name,score_hard,score_soft,constraint_breakdown,metrics").order("created_at", { ascending: false }).limit(1),
        supabase.from("pd_runs").select("id,name,score_hard,score_soft,constraint_breakdown,metrics").order("created_at", { ascending: false }).limit(1),
      ]);
      const options: RunOption[] = [];
      if (schedules?.[0]) options.push({ id: `schedule:${schedules[0].id}`, vertical: "Shift Scheduling", name: schedules[0].name, context: schedules[0] });
      if (taskRuns?.[0]) options.push({ id: `task:${taskRuns[0].id}`, vertical: "Task Scheduling", name: taskRuns[0].name, context: taskRuns[0] });
      if (fieldRuns?.[0]) options.push({ id: `field:${fieldRuns[0].id}`, vertical: "Field Service Routing", name: fieldRuns[0].name, context: fieldRuns[0] });
      if (pdRuns?.[0]) options.push({ id: `pd:${pdRuns[0].id}`, vertical: "Pickup & Delivery", name: pdRuns[0].name, context: pdRuns[0] });
      setRuns(options);
      if (options.length > 0) setSelectedRunId(options[0].id);
    })();
  }, []);

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    const userTurn: ChatTurn = { role: "user", text: question };
    setChat((c) => [...c, userTurn]);
    setQuestion("");
    try {
      const selectedRun = runs.find((r) => r.id === selectedRunId);
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userTurn.text, context: selectedRun?.context ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Copilot request failed");
      setChat((c) => [...c, { role: "assistant", text: json.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copilot request failed");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Copilot</h1>
      <p className="mt-1 text-sm text-muted">
        Ask questions about your most recent solve — Copilot grounds every answer in your actual constraint breakdown and metrics, nothing invented.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">Solve context</label>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No solves yet — run a scheduler or router first, then come back and ask Copilot about the result.</p>
        ) : (
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="mt-2 w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.vertical} — {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {chat.map((turn, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 text-sm ${
              turn.role === "user" ? "border-border bg-surface" : "border-primary/40 bg-primary/10"
            }`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {turn.role === "user" ? "You" : "Copilot"}
            </p>
            <p className="whitespace-pre-wrap">{turn.text}</p>
          </div>
        ))}
        {chat.length === 0 && (
          <p className="text-sm text-muted">
            Try: &ldquo;Why is my score negative?&rdquo; or &ldquo;What&rsquo;s the fastest way to fix the hard constraint violations?&rdquo;
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      <div className="sticky bottom-6 mt-6 flex gap-2 rounded-xl border border-border bg-surface p-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && ask()}
          placeholder="Ask about your latest solve…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={ask}
          disabled={busy || !question.trim()}
          className="glow-ring cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
