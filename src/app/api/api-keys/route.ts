import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("api_keys")
    .select("id,name,key_prefix,last_used_at,revoked,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitResult = rateLimit(`api-keys-create:${user.id}`, 10, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json({ error: "Too many keys created recently — please slow down." }, { status: 429 });
  }

  let name = "API key";
  try {
    const body = await request.json();
    if (body?.name) name = String(body.name).slice(0, 80);
  } catch {
    // No body — use default name.
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  const { key, hash, prefix } = generateApiKey();

  const { data: row, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, organization_id: profile?.organization_id ?? null, name, key_prefix: prefix, key_hash: hash })
    .select("id,name,key_prefix,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The plaintext key is returned exactly once, here — it is never stored or
  // retrievable again after this response.
  return NextResponse.json({ key, record: row });
}
