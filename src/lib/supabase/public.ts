import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free Supabase client for public marketing pages (e.g.
 * /pricing). Unlike lib/supabase/server.ts, this never calls next/headers'
 * cookies(), so pages using it are NOT forced into fully dynamic rendering —
 * they can be statically generated and served from Vercel's CDN edge cache
 * with `export const revalidate = <seconds>`, which matters under bursty
 * public traffic. Only use this for data that is genuinely public (RLS
 * allows anon SELECT) — never for anything scoped to a signed-in user.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
