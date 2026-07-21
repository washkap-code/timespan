/**
 * Plan-based rate limits for API-key-authenticated (server-to-server) calls.
 * Dashboard (cookie-session) usage keeps the existing flat per-user limit
 * defined in each route — these tiers apply specifically to the metered,
 * billable API usage tied to a plan.
 */
export const SOLVES_PER_MINUTE_BY_PLAN: Record<string, number> = {
  launch: 5,
  team: 30,
  enterprise: 120,
};

export function solveLimitForPlan(planId: string): number {
  return SOLVES_PER_MINUTE_BY_PLAN[planId] ?? SOLVES_PER_MINUTE_BY_PLAN.launch;
}
