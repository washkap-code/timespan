import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/admin";

async function updatePrice(formData: FormData) {
  "use server";
  const { role } = await getSessionWithRole();
  if (role !== "admin") return;

  const supabase = await createClient();
  const planId = formData.get("planId") as string;
  const priceRaw = formData.get("price") as string;
  const price = priceRaw === "" ? null : Number(priceRaw);
  await supabase.from("plans").update({ price_monthly: price }).eq("id", planId);
  revalidatePath("/dashboard/admin/plans");
}

const FEATURE_LABELS: Record<string, string> = {
  pure_api: "Pure API access",
  solver_engine: "Enterprise solver engine",
  webhooks: "Webhook configuration",
  multi_user: "Multi-user collaboration",
  dataset_overview: "Dataset overview",
  score_analysis: "Score & constraint analysis",
  plan_visualizations: "Plan visualizations",
  kpi_dashboard: "KPI dashboard",
  roadmap_voting: "Roadmap voting",
  support_portal: "Support portal",
  what_if: "What-if scenarios",
  efficiency_xray: "Efficiency X-Ray",
  reality_checks: "Reality checks",
  goal_alignment: "Goal alignment",
  benchmarking: "Comparison & benchmarking",
  copilot: "Copilot AI recommendations",
  custom_constraints: "Custom constraints & model extensions",
  white_glove_onboarding: "White-glove onboarding",
  dedicated_slack: "Dedicated Slack channel",
  dedicated_advisor: "Dedicated optimization advisor",
  support_247: "24/7 support",
  self_hosted_available: "Self-hosted available",
};

export default async function AdminPlans() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("sort_order");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Plans & billing</h1>
      <p className="mt-1 text-sm text-muted">
        Three tiers mirroring the market structure — API-first, team collaboration, and full intelligence suite.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>

            <form action={updatePrice} className="mt-4 flex items-center gap-2">
              <input type="hidden" name="planId" value={p.id} />
              <span className="text-sm text-muted">$</span>
              <input
                name="price"
                type="number"
                defaultValue={p.price_monthly ?? ""}
                placeholder="Custom"
                className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary-light"
              />
              <span className="text-sm text-muted">/mo</span>
              <button
                type="submit"
                className="ml-auto cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary-light/50 hover:bg-surface-2"
              >
                Save
              </button>
            </form>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted">
              <p>Threads: {p.threads} · Memory: {p.memory_gb}GB</p>
              <p>Tenants: {(p.tenants ?? []).join(", ")}</p>
              <p>Seats: {p.seats_included ?? "Unlimited"} · Config profiles: {p.config_profile_limit ?? "Unlimited"}</p>
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
              {Object.entries(p.features as Record<string, boolean>)
                .filter(([, v]) => v)
                .map(([key]) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-success">✓</span>
                    {FEATURE_LABELS[key] ?? key}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
