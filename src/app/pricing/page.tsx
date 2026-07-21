import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Sections";
import { createClient } from "@/lib/supabase/server";

const TIER_STYLE: Record<string, string> = {
  launch: "",
  team: "border-primary/60 shadow-glow",
  enterprise: "",
};

const FEATURE_LABELS: Record<string, string> = {
  pure_api: "Pure API access — built for developers",
  solver_engine: "Production-grade optimization engine",
  webhooks: "Webhook configuration",
  multi_user: "Multi-user collaboration",
  dataset_overview: "Dataset overview — list, search, categorize runs",
  score_analysis: "Score analysis & constraint X-Ray",
  plan_visualizations: "Plan visualizations (grid & timeline)",
  kpi_dashboard: "Metrics & KPI dashboard",
  roadmap_voting: "Product roadmap voting",
  support_portal: "Support portal",
  what_if: "What-if scenario comparison",
  efficiency_xray: "Efficiency X-Ray — bottleneck detection",
  reality_checks: "Reality checks against real-world feasibility",
  goal_alignment: "Goal alignment to business objectives",
  benchmarking: "Comparison UI & benchmarking",
  copilot: "Copilot — AI-assisted planning recommendations",
  custom_constraints: "Custom constraints & model extensions",
  white_glove_onboarding: "White-glove onboarding",
  dedicated_slack: "Dedicated Slack channel",
  dedicated_advisor: "Dedicated optimization advisor",
  support_247: "24/7 support",
  self_hosted_available: "Self-hosted deployment available",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("sort_order");

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-36">
        <div className="text-center">
          <p className="mb-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-light">
            Platform pricing
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Start with a spark. <span className="text-gradient">Reach the horizon.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Three tiers built around how you work — from API-first integration to full strategic
            intelligence. Works across every TimeSpan product.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {(plans ?? []).map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border border-border bg-surface p-8 ${TIER_STYLE[p.id]}`}
            >
              {p.id === "team" && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Recommended
                </span>
              )}
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="mt-2 text-sm text-muted">{p.tagline}</p>
              <p className="mt-6 text-3xl font-bold">
                {p.price_monthly == null ? (
                  "Custom"
                ) : p.price_monthly === 0 ? (
                  "Free"
                ) : (
                  <>
                    ${p.price_monthly}
                    <span className="text-base font-normal text-muted">/mo</span>
                  </>
                )}
              </p>
              <Link
                href="/login?mode=signup"
                className="glow-ring mt-6 block cursor-pointer rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
              >
                Start with {p.name}
              </Link>
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6 text-sm">
                {Object.entries(p.features as Record<string, boolean>)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <li key={key} className="flex items-start gap-2">
                      <span className="mt-0.5 text-success">✓</span>
                      <span>{FEATURE_LABELS[key] ?? key}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-surface/40 p-8">
          <h2 className="text-lg font-semibold">Hosting & infrastructure</h2>
          <p className="mt-1 text-sm text-muted">Scaled to match your workload. All tiers run on TimeSpan&apos;s managed cloud unless noted.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {(plans ?? []).map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-background p-5">
                <p className="font-semibold">{p.name}</p>
                <p className="mt-2 text-xs text-muted">Threads: {p.threads}</p>
                <p className="text-xs text-muted">Memory: {p.memory_gb}GB</p>
                <p className="text-xs text-muted">Tenants: {(p.tenants ?? []).join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
