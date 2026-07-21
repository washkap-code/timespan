import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/admin";

async function toggleAdmin(formData: FormData) {
  "use server";
  const { role: callerRole } = await getSessionWithRole();
  if (callerRole !== "admin") return;

  const supabase = await createClient();
  const userId = formData.get("userId") as string;
  const nextRole = formData.get("nextRole") as string;
  await supabase.from("profiles").update({ role: nextRole }).eq("id", userId);
  revalidatePath("/dashboard/admin/users");
}

export default async function AdminUsers() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,organization_id,created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted">Every account across every organization on TimeSpan.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-4">{u.full_name || "—"}</td>
                <td className="p-4 text-muted">{u.email}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === "admin" ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <form action={toggleAdmin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="nextRole" value={u.role === "admin" ? "user" : "admin"} />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary-light/50 hover:bg-surface-2"
                    >
                      {u.role === "admin" ? "Revoke admin" : "Make admin"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
