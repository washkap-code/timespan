import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Sections";

export const metadata = { title: "API Documentation — TimeSpan" };

const NAV_LINKS = [
  { href: "#quick-start", label: "Quick start" },
  { href: "#auth", label: "Authentication" },
  { href: "#shift-scheduling", label: "Employee Shift Scheduling API" },
  { href: "#task-scheduling", label: "Task Scheduling API" },
  { href: "#field-service", label: "Field Service Routing API" },
  { href: "#pickup-delivery", label: "Pickup & Delivery Routing API" },
  { href: "#copilot", label: "Copilot API" },
  { href: "#webhooks", label: "Webhooks" },
  { href: "#rate-limits", label: "Rate limits" },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface-2 p-5 font-mono text-xs leading-relaxed text-primary-light">
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-36">
        <p className="mb-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-light">
          Developer docs
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">API Documentation</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Everything you need to call TimeSpan&apos;s scheduling optimization endpoints from your own stack.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-28 space-y-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-16 text-sm leading-relaxed text-muted">
            <div id="quick-start">
              <h2 className="text-xl font-semibold text-foreground">Quick start</h2>
              <p className="mt-3">There are two ways to call TimeSpan&apos;s solve endpoints:</p>
              <ol className="mt-4 list-decimal space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">API key (server-to-server, stateless).</strong>{" "}
                  <Link href="/login?mode=signup" className="cursor-pointer text-primary-light underline">
                    Create a TimeSpan account
                  </Link>
                  , generate a key from{" "}
                  <Link href="/dashboard/api-keys" className="cursor-pointer text-primary-light underline">
                    Dashboard → API keys
                  </Link>
                  , then send your full dataset in the request body with an{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-primary-light">Authorization: Bearer</code> header — nothing
                  is read from or written to your account, you get the solved result straight back.
                </li>
                <li>
                  <strong className="text-foreground">Dashboard session (stateful).</strong> Sign in, add employees/shifts (or
                  load demo data) in the dashboard, then call the same endpoint from your signed-in browser session — the
                  result is saved to your account and shows up in the UI too.
                </li>
                <li>Either way, read back the score, constraint breakdown, and metrics in the JSON response.</li>
              </ol>
            </div>

            <div id="auth">
              <h2 className="text-xl font-semibold text-foreground">Authentication</h2>
              <p className="mt-3">
                <strong className="text-foreground">API keys</strong> — pass{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">Authorization: Bearer ts_live_...</code> on any solve
                endpoint. Keys are created and revoked from{" "}
                <Link href="/dashboard/api-keys" className="cursor-pointer text-primary-light underline">Dashboard → API keys</Link>,
                are shown in full only once at creation, and stored as a hash — TimeSpan can&apos;t recover a lost key,
                only issue a new one. API-key calls run in stateless mode: send the full dataset, get the result back,
                nothing persisted. Rate limits scale with your plan.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Dashboard session</strong> — a signed-in Supabase session
                (email/password or Google OAuth), used by the web UI and any server-side code forwarding that session
                cookie. This path reads/writes your stored employees, shifts, jobs, and results, scoped by row-level
                security to your own data or your organization&apos;s.
              </p>
              <p className="mt-3">
                Requests without a valid key or session return <code className="rounded bg-surface-2 px-1.5 py-0.5">401 Unauthorized</code>.
              </p>
            </div>

            <div id="shift-scheduling">
              <h2 className="text-xl font-semibold text-foreground">Employee Shift Scheduling API</h2>
              <p className="mt-3">
                Solves shift assignment against skills, availability, overlap and fairness constraints for the
                employees and shifts currently stored on your account.
              </p>
              <p className="mt-4 font-mono text-xs text-accent">POST /api/solve</p>
              <p className="mt-3 font-medium text-foreground">API key (stateless)</p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/solve \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ts_live_..." \\
  -d '{
    "employees": [
      { "id": "amy", "name": "Amy", "skills": ["barista"], "max_shifts": 5, "unavailable_days": [] }
    ],
    "shifts": [
      { "id": "sat-am", "label": "Saturday AM", "day": 5, "start_hour": 8, "end_hour": 12, "required_skill": "barista" }
    ]
  }'`}</CodeBlock>
              <p className="mt-3 font-medium text-foreground">Dashboard session (stateful)</p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/solve \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{
    "label": "Week 32 schedule",
    "weights": {
      "unassignedPenalty": 10,
      "sameDayOverlapPenalty": 1,
      "fairnessPenalty": 1
    }
  }'`}</CodeBlock>
              <p className="mt-4 font-medium text-foreground">Response</p>
              <CodeBlock>{`{
  "schedule": { "id": "...", "name": "Week 32 schedule", "status": "feasible", ... },
  "assignments": [
    { "shift_id": "...", "employee_id": "..." }
  ],
  "score": { "hard": 0, "soft": -14 },
  "explanation": [
    "Feasible: all hard constraints (skills, availability, overlaps, max load) satisfied.",
    "Soft score -14 after 3200 local-search moves (fairness + rest optimization)."
  ],
  "breakdown": [
    { "code": "H1", "label": "Skill mismatch", "severity": "hard", "count": 0, "impact": 0 },
    { "code": "S1", "label": "Fairness deviation", "severity": "soft", "count": 4, "impact": -4 }
  ],
  "metrics": { "coverage": 100, "fairnessIndex": 88, "utilization": 76 }
}`}</CodeBlock>
              <p className="mt-4">
                <code className="rounded bg-surface-2 px-1.5 py-0.5">weights</code> is optional — omit it to use
                platform defaults, or pass a saved Config Profile&apos;s weights from the scheduler UI.
              </p>
            </div>

            <div id="task-scheduling">
              <h2 className="text-xl font-semibold text-foreground">Task Scheduling API</h2>
              <p className="mt-3">
                Solves job-to-resource assignment against skills, dependency ordering, and daily resource
                capacity for the resources and jobs currently stored on your account.
              </p>
              <p className="mt-4 font-mono text-xs text-accent">POST /api/solve-tasks</p>
              <p className="mt-3 text-xs text-muted">
                Same two auth modes as above. API-key calls pass{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">{`{ "resources": [...], "jobs": [...] }`}</code> in
                the body instead of reading stored data.
              </p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/solve-tasks \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{ "label": "Sprint 14 plan" }'`}</CodeBlock>
              <p className="mt-4 font-medium text-foreground">Response</p>
              <CodeBlock>{`{
  "run": { "id": "...", "name": "Sprint 14 plan", "status": "feasible", ... },
  "assignments": [
    { "job_id": "...", "resource_id": "...", "assigned_day": 2 }
  ],
  "score": { "hard": 0, "soft": -6 },
  "breakdown": [
    { "code": "H2", "label": "Dependency ordering violation", "severity": "hard", "count": 0, "impact": 0 },
    { "code": "S2", "label": "Priority-weighted tardiness (days late, summed)", "severity": "soft", "count": 2, "impact": -2 }
  ],
  "metrics": { "coverage": 100, "onTimeRate": 86, "utilization": 71 }
}`}</CodeBlock>
            </div>

            <div id="field-service">
              <h2 className="text-xl font-semibold text-foreground">Field Service Routing API</h2>
              <p className="mt-3">
                Assigns and sequences field jobs (site visits) across your technicians, using real drive-time
                estimates to build feasible, low-travel routes. Solves skill matching, time windows, and shift
                length together.
              </p>
              <p className="mt-4 font-mono text-xs text-accent">POST /api/solve-field-service</p>
              <p className="mt-3 text-xs text-muted">
                API-key calls pass{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">{`{ "technicians": [...], "jobs": [...] }`}</code> in
                the body instead of reading stored data.
              </p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/solve-field-service \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{ "label": "Tuesday routes" }'`}</CodeBlock>
              <p className="mt-4 font-medium text-foreground">Response</p>
              <CodeBlock>{`{
  "run": { "id": "...", "name": "Tuesday routes", "status": "feasible", ... },
  "assignments": [
    { "job_id": "...", "technician_id": "...", "sequence": 0, "eta_hour": 9.25 }
  ],
  "score": { "hard": 0, "soft": -142 },
  "breakdown": [
    { "code": "H2", "label": "Time-window violation", "severity": "hard", "count": 0, "impact": 0 },
    { "code": "S2", "label": "Total drive time (minutes)", "severity": "soft", "count": 142, "impact": -142 }
  ],
  "metrics": { "coverage": 100, "onTimeRate": 100, "totalDriveMinutes": 142, "distanceSource": "google" }
}`}</CodeBlock>
              <p className="mt-4">
                Drive times come from Google Maps&apos; Distance Matrix API when the platform is configured with a
                maps key. Without one, the solver falls back to straight-line distance estimates and flags it in
                the response (<code className="rounded bg-surface-2 px-1.5 py-0.5">distanceSource: &quot;estimated&quot;</code>) rather than failing.
              </p>
            </div>

            <div id="pickup-delivery">
              <h2 className="text-xl font-semibold text-foreground">Pickup & Delivery Routing API</h2>
              <p className="mt-3">
                Classic vehicle routing with pickup-delivery pairs (VRPPD): routes vehicles through pickup and
                delivery stops while respecting vehicle capacity, pickup-before-delivery precedence on the same
                vehicle, and time windows on both ends of each job.
              </p>
              <p className="mt-4 font-mono text-xs text-accent">POST /api/solve-pickup-delivery</p>
              <p className="mt-3 text-xs text-muted">
                API-key calls pass{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">{`{ "vehicles": [...], "jobs": [...] }`}</code> in
                the body instead of reading stored data.
              </p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/solve-pickup-delivery \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{ "label": "Morning delivery run" }'`}</CodeBlock>
              <p className="mt-4 font-medium text-foreground">Response</p>
              <CodeBlock>{`{
  "run": { "id": "...", "name": "Morning delivery run", "status": "feasible", ... },
  "assignments": [
    { "job_id": "...", "vehicle_id": "...", "pickup_sequence": 0, "delivery_sequence": 2,
      "pickup_eta_hour": 8.5, "delivery_eta_hour": 10.1 }
  ],
  "score": { "hard": 0, "soft": -203 },
  "breakdown": [
    { "code": "H2", "label": "Vehicle capacity exceeded", "severity": "hard", "count": 0, "impact": 0 },
    { "code": "S2", "label": "Total drive time (minutes)", "severity": "soft", "count": 203, "impact": -203 }
  ],
  "metrics": { "coverage": 100, "onTimeRate": 92, "totalDriveMinutes": 203, "distanceSource": "google" }
}`}</CodeBlock>
            </div>

            <div id="copilot">
              <h2 className="text-xl font-semibold text-foreground">Copilot API</h2>
              <p className="mt-3">
                Ask questions about a solve result in plain language. Copilot is given the constraint breakdown,
                metrics and score from the run you specify — it never invents facts outside that context.
              </p>
              <p className="mt-4 font-mono text-xs text-accent">POST /api/copilot</p>
              <CodeBlock>{`curl -X POST https://timespan.online/api/copilot \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{
    "question": "Why is my score negative?",
    "context": { "score_hard": 0, "score_soft": -142, "constraint_breakdown": [...], "metrics": {...} }
  }'`}</CodeBlock>
              <p className="mt-4 font-medium text-foreground">Response</p>
              <CodeBlock>{`{ "answer": "Your plan is fully feasible (0 hard violations)..." }`}</CodeBlock>
            </div>

            <div id="webhooks">
              <h2 className="text-xl font-semibold text-foreground">Webhooks</h2>
              <p className="mt-3">
                Configure a webhook URL from the dashboard to receive a <code className="rounded bg-surface-2 px-1.5 py-0.5">schedule.solved</code> event
                every time <code className="rounded bg-surface-2 px-1.5 py-0.5">/api/solve</code> completes. Delivery is best-effort
                (fire-and-forget) and includes an optional shared secret in the{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">X-Webhook-Secret</code> header for you to verify.
              </p>
              <CodeBlock>{`POST <your webhook url>
Content-Type: application/json
X-Webhook-Secret: <your configured secret>

{
  "event": "schedule.solved",
  "schedule_id": "...",
  "score": { "hard": 0, "soft": -14 },
  "metrics": { "coverage": 100, "fairnessIndex": 88, "utilization": 76 }
}`}</CodeBlock>
            </div>

            <div id="rate-limits">
              <h2 className="text-xl font-semibold text-foreground">Rate limits</h2>
              <p className="mt-3">
                Dashboard (session) calls are capped at 20 requests per minute per account (plus a secondary
                per-IP cap). API-key calls are capped per plan instead: 5/min on Launch, 30/min on Team, 120/min on
                Enterprise. If you exceed the limit you&apos;ll get a{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">429</code> response with a{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5">Retry-After</code> header telling you how many
                seconds to wait. Copilot is capped separately at 15 requests per minute per account.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
