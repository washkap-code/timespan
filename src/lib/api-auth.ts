import { createPublicClient } from "@/lib/supabase/public";
import { hashApiKey, isApiKeyFormat } from "@/lib/api-keys";

/**
 * Resolves API-key authentication from an `Authorization: Bearer <key>`
 * header, as a server-to-server alternative to the browser session cookie
 * flow used by the dashboard. Returns null if no valid key is present —
 * callers should fall back to their existing cookie-session auth check.
 *
 * Requests authenticated this way run in "stateless" mode: the caller sends
 * their full dataset in the request body and gets a result back directly,
 * with nothing read from or written to the database on their behalf. This
 * matches how the docs already describe the API ("JSON in, JSON out") and
 * keeps the security surface small — a leaked key can run compute against
 * data the caller already possesses, not read or mutate their stored data.
 */
export interface ApiKeyAuth {
  mode: "api_key";
  userId: string;
  organizationId: string | null;
  keyId: string;
  planId: string;
}

export async function resolveApiKeyAuth(request: Request): Promise<ApiKeyAuth | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const key = header.slice("Bearer ".length).trim();
  if (!isApiKeyFormat(key)) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("verify_api_key", { p_key_hash: hashApiKey(key) });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id) return null;

  return {
    mode: "api_key",
    userId: row.user_id,
    organizationId: row.organization_id ?? null,
    keyId: row.key_id,
    planId: row.plan_id ?? "launch",
  };
}
