import { randomBytes, createHash } from "crypto";

/**
 * API key generation/hashing for TimeSpan's developer API.
 *
 * Keys look like `ts_live_<32 url-safe chars>`. Only a SHA-256 hash of the
 * key is ever stored (see migration api_keys_auth) — the plaintext value is
 * returned once, at creation time, and never persisted or logged anywhere.
 */

const KEY_PREFIX = "ts_live_";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${secret}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) };
}

export function isApiKeyFormat(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length > KEY_PREFIX.length + 10;
}
