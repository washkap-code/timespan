import { createClient } from "@/lib/supabase/server";

export async function getSessionWithRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as "user" | "admin" | null };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, user, role: (profile?.role as "user" | "admin" | undefined) ?? "user" };
}
