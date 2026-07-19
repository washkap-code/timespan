# TimeSpan

Scheduling and routing optimization platform — inspired by Timefold, built from the ground up.

## Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS** — dark design system (violet `#7C3AED` / cyan `#22D3EE`, Inter)
- **GSAP** — scroll-triggered motion (stagger reveals, counters) + Higgsfield-generated hero motion graphic
- **Supabase** — Postgres, Auth (email/password), RLS on all tables
- **Vercel** — hosting

## Structure

- `src/app/page.tsx` — marketing site (hero video, products, how-it-works, stats)
- `src/app/login` — Supabase auth
- `src/app/dashboard` — protected app (middleware-guarded)
- `src/app/dashboard/scheduler` — working employee shift scheduling demo
- `src/lib/solver/solver.ts` — constraint solver (construction heuristic + late-acceptance local search; hard/soft scoring like Timefold)
- `src/app/api/solve/route.ts` — solve endpoint; persists schedules + assignments

## Setup

```bash
npm install
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Database

Schema lives in Supabase (project `timespan`): `profiles`, `employees`, `shifts`, `schedules`, `schedule_assignments` — all with row-level security scoped to the signed-in user.
