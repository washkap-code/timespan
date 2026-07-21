import Link from "next/link";
import { Reveal, CountUp } from "./Motion";
import { LogoMark } from "@/components/Logo";

/* ---------- Products ---------- */

const products = [
  {
    name: "Employee Shift Scheduling",
    desc: "Build fair, compliant schedules at scale. Skills, availability, labor rules and fairness handled out of the box.",
    tag: "Live in platform",
    live: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Field Service Routing",
    desc: "Optimize technician schedules and travel. Time windows, skills and SLAs, replanned in real time.",
    tag: "Coming soon",
    live: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 20l-5.5-2.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20z" strokeLinejoin="round" />
        <path d="M9 7v13M15 4.5v13" />
      </svg>
    ),
  },
  {
    name: "Pickup & Delivery Routing",
    desc: "Optimize every pickup, drop-off and route. Capacities, precedence and same-day disruption handling.",
    tag: "Coming soon",
    live: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" strokeLinejoin="round" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    name: "Task Scheduling",
    desc: "Assign tasks with maximum efficiency. Dependencies, priorities and resource capacity, solved together.",
    tag: "Live in platform",
    live: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
        <path d="M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Products() {
  return (
    <section id="products" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <h2 data-reveal className="text-3xl font-bold tracking-tight md:text-5xl">
          APIs for your toughest <span className="text-gradient">planning problems</span>
        </h2>
        <p data-reveal className="mt-4 max-w-xl text-muted">
          Routes, shifts, jobs or tasks — TimeSpan handles the complexity so you ship in days, not months.
        </p>
      </Reveal>
      <Reveal className="mt-12 grid gap-5 sm:grid-cols-2">
        {products.map((p) => (
          <div
            key={p.name}
            data-reveal
            className="glow-ring group cursor-pointer rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:border-primary/50"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-xl bg-primary/15 p-3 text-primary-light">{p.icon}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.live ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted"
                }`}
              >
                {p.tag}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{p.name} API</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------- Use cases ---------- */
/* Original scenarios for the product that actually ships today (Employee Shift
   Scheduling). Written from scratch for TimeSpan — not adapted from any
   competitor's copy or case studies. */

const useCases = [
  {
    tag: "Healthcare",
    title: "Nurse & care staff rostering",
    body: "Match certifications to acuity levels, enforce mandatory rest periods between shifts, and spread nights and weekends evenly so burnout doesn't concentrate on the same few people every month.",
  },
  {
    tag: "Retail & hospitality",
    title: "Variable-footfall staff scheduling",
    body: "Staff up for Saturday rushes and down for Tuesday mornings without a spreadsheet marathon. Availability windows, student work-hour caps, and minimum-rest rules are respected automatically.",
  },
  {
    tag: "Security & facilities",
    title: "24/7 rotating crew coverage",
    body: "Keep every post covered around the clock with licensed staff only, while rotating who gets the overnight and holiday shifts so the same crew isn't stuck with the worst slots every cycle.",
  },
  {
    tag: "Multi-site operations",
    title: "Shared labor pool across locations",
    body: "Pool qualified staff across nearby sites, balance hours fairly across the whole group rather than site-by-site, and let the solver figure out who should work where each week.",
  },
  {
    tag: "Product & engineering teams",
    title: "Dependency-aware sprint planning",
    body: "Assign work across teams by skill and capacity while respecting what has to finish before what starts, and see which deadlines are realistically at risk before the sprint begins, not after.",
  },
  {
    tag: "Professional services",
    title: "Project delivery across shared crews",
    body: "Sequence client deliverables that depend on each other, balance load across a small bench of specialists, and get an early warning when a priority project is going to land late.",
  },
];

const roadmapVerticals = [
  { name: "Field Service Routing", body: "Technician dispatch with travel time, time windows and skills — in development." },
  { name: "Pickup & Delivery Routing", body: "Route optimization for courier and delivery fleets — in development." },
];

export function UseCases() {
  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <h2 data-reveal className="text-3xl font-bold tracking-tight md:text-5xl">
          Built for how <span className="text-gradient">real teams schedule</span>
        </h2>
        <p data-reveal className="mt-4 max-w-xl text-muted">
          Employee Shift Scheduling and Task Scheduling are live in the platform today. Here&apos;s where teams are putting them to work.
        </p>
      </Reveal>
      <Reveal className="mt-12 grid gap-5 sm:grid-cols-2">
        {useCases.map((u) => (
          <div key={u.title} data-reveal className="rounded-2xl border border-border bg-surface p-7 transition-colors duration-300 hover:border-primary/40">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light">{u.tag}</span>
            <h3 className="mt-4 text-lg font-semibold">{u.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{u.body}</p>
          </div>
        ))}
      </Reveal>

      <Reveal className="mt-16">
        <p data-reveal className="text-xs font-medium uppercase tracking-widest text-muted">On the roadmap</p>
        <div data-reveal className="mt-5 grid gap-4 sm:grid-cols-3">
          {roadmapVerticals.map((r) => (
            <div key={r.name} className="rounded-xl border border-dashed border-border bg-transparent p-5">
              <h4 className="text-sm font-semibold text-foreground">{r.name}</h4>
              <p className="mt-1.5 text-sm text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- How it works ---------- */

const steps = [
  {
    n: "01",
    title: "Send your data",
    body: "Organize resources and jobs in your software. TimeSpan consumes the data you already have, in JSON.",
    code: `POST /v1/schedules\n{ "employees": [...],\n  "shifts": [...] }`,
  },
  {
    n: "02",
    title: "We solve",
    body: "A stateless constraint solver weighs skills, availability, fairness and labor rules against your goals.",
    code: `"score": {\n  "hard": 0,\n  "soft": -12 }`,
  },
  {
    n: "03",
    title: "Get your schedule",
    body: "A fully optimized plan returns to your software — distribute as-is, or replan when disruptions hit.",
    code: `{ "assignments": [\n  { "shift": "sat-am",\n    "employee": "amy" } ] }`,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <h2 data-reveal className="text-3xl font-bold tracking-tight md:text-5xl">
            JSON in. <span className="text-gradient">Optimized plan out.</span>
          </h2>
          <p data-reveal className="mt-4 max-w-xl text-muted">
            No migration, no solver expertise, no lock-in. Call the API from your existing stack.
          </p>
        </Reveal>
        <Reveal className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} data-reveal className="rounded-2xl border border-border bg-background p-7">
              <span className="font-mono text-sm text-accent">/ {s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              <pre className="mt-5 overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-xs leading-relaxed text-primary-light">
                {s.code}
              </pre>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Platform pillars ---------- */

const pillars = [
  { title: "Easy to integrate", body: "Stateless REST over JSON. Technology-agnostic. Test with your own data in a few lines of code." },
  { title: "Proven at scale", body: "Schedule hundreds of thousands of shifts and tens of thousands of jobs in a single run." },
  { title: "Explainable by design", body: "Every assignment comes with a score breakdown, so planners can see exactly why the plan looks the way it does." },
  { title: "Real-world complexity", body: "Skills, fairness, labor laws, dependencies and hundreds of other constraints — replanned in real time." },
];

export function Platform() {
  return (
    <section id="platform" className="mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <h2 data-reveal className="text-3xl font-bold tracking-tight md:text-5xl">
          Most scheduling tools break. <span className="text-gradient">This doesn&apos;t.</span>
        </h2>
      </Reveal>
      <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <div key={p.title} data-reveal className="rounded-2xl border border-border bg-surface p-6 transition-colors duration-300 hover:border-accent/40">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------- Stats ---------- */
/* Platform capability specs — not adoption/customer claims. TimeSpan is early;
   these numbers describe what the engine does, and are true today rather than
   invented traction. */

const stats = [
  { value: 7, suffix: "", label: "built-in constraint types, hard & soft" },
  { value: 1, suffix: "s", label: "typical solve time for a week-long roster" },
  { value: 3, suffix: "", label: "pricing tiers, from free API access to enterprise" },
  { value: 100, suffix: "%", label: "of runs return a full constraint breakdown" },
];

export function Stats() {
  return (
    <section id="stats" className="border-y border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p data-reveal className="text-center text-xs font-medium uppercase tracking-widest text-muted">
            The platform, as it stands today
          </p>
        </Reveal>
        <Reveal className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} data-reveal className="text-center">
              <p className="text-4xl font-bold text-gradient md:text-5xl">
                <CountUp to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CTA + Footer ---------- */

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28 text-center">
      <Reveal>
        <h2 data-reveal className="text-3xl font-bold tracking-tight md:text-5xl">
          When scheduling works, <span className="text-gradient">everything works.</span>
        </h2>
        <p data-reveal className="mx-auto mt-4 max-w-xl text-muted">
          Less waste. More control. Teams that trust the plan. Run your own data through the platform and see results today.
        </p>
        <div data-reveal className="mt-10">
          <Link
            href="/login?mode=signup"
            className="glow-ring inline-block cursor-pointer rounded-xl bg-primary px-8 py-4 font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Get started free
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <LogoMark size={20} /> © {new Date().getFullYear()} TimeSpan. All rights reserved.
        </span>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted">
          <Link href="/login" className="cursor-pointer transition-colors hover:text-foreground">Platform</Link>
          <a href="#products" className="cursor-pointer transition-colors hover:text-foreground">Products</a>
          <Link href="/docs" className="cursor-pointer transition-colors hover:text-foreground">Docs</Link>
          <Link href="/privacy" className="cursor-pointer transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="cursor-pointer transition-colors hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
