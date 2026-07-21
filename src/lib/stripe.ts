import Stripe from "stripe";

/**
 * Server-side Stripe client. STRIPE_SECRET_KEY is read from the environment
 * and never sent to the client — all billing operations happen through the
 * /api/billing/* routes.
 *
 * Lazily constructed so importing this module doesn't throw in environments
 * (like local dev without the key set) where billing routes simply won't
 * be reachable/functional yet.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Billing is not configured — STRIPE_SECRET_KEY is missing.");
  // Cast the config object rather than pinning a literal apiVersion type —
  // the Stripe SDK ties that literal to the exact installed package version,
  // and we'd rather track whatever version npm resolves than fail the build
  // over a string-literal mismatch.
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" } as Stripe.StripeConfig);
  return _stripe;
}
