"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/api-keys");
    const json = await res.json();
    if (res.ok) setKeys(json.keys ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "API key" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create key");
      setNewKey(json.key);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    }
    setBusy(false);
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? Any integration using it will stop working immediately.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">API keys</h1>
      <p className="mt-1 text-sm text-muted">
        Authenticate server-to-server calls with <code className="rounded bg-surface-2 px-1.5 py-0.5">Authorization: Bearer &lt;key&gt;</code> instead
        of a browser session. API-key calls are stateless — send your full dataset in the request body and get the
        result back directly; nothing is read from or written to your stored data.
      </p>

      {newKey && (
        <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-warning">Copy this key now — it won&apos;t be shown again.</p>
          <p className="mt-2 select-all break-all rounded-lg bg-background px-3 py-2 font-mono text-sm">{newKey}</p>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-2 rounded-xl border border-border bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. Production server)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
        />
        <button
          onClick={createKey}
          disabled={busy}
          className="glow-ring cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create key"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}

      <div className="mt-8 space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-semibold">{k.name}</p>
              <p className="font-mono text-xs text-muted">
                {k.key_prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : " · never used"}
              </p>
            </div>
            {k.revoked ? (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">Revoked</span>
            ) : (
              <button
                onClick={() => revokeKey(k.id)}
                className="cursor-pointer rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
        {keys.length === 0 && <p className="text-sm text-muted">No API keys yet — create one above to call the API from your own server.</p>}
      </div>
    </div>
  );
}
