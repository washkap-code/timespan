import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/admin";

async function createOrg(formData: FormData) {
  "use server";
  const { user, role } = await getSessionWithRole();
  if (role !== "admin" || !user) return;

  const supabase = await createClient();
  const name = formData.get("name") as string;
  const planId = formData.get("planId") as string;
  if (!name) return;
  await supabase.from("organizations").insert({ name, plan_id: planId, owner_id: user.id });
  revalidatePath("/dashboard/admin/organizations");
}

export default async function AdminOrganizations() {
  const supabase = await createClient();
  const [{ data: orgs }, { data: plans }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("id,name,plan_id,owner_id,created_at").order("created_at", { ascending: false }),
    supabase.from("plans").select("id,name").order("sort_order"),
    supabase.from("organization_members").select("organization_id"),
  ]);

  const memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.organization_id] = (acc[m.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
      <p className="mt-1 text-sm text-muted">Multi-user teams and their plan assignment.</p>

      <form action={createOrg} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-5">
        <div>
          <label className="block text-xs font-medium text-muted">Organization name</label>
          <input
            name="name"
            required
            className="mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            placeholder="Acme Logistics"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted">Plan</label>
          <select
            name="planId"
            defaultValue="launch"
            className="mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
          >
            {(plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Create organization
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Members</th>
              <th className="p-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(orgs ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-4">{o.name}</td>
                <td className="p-4">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium capitalize text-primary-light">
                    {o.plan_id}
                  </span>
                </td>
                <td className="p-4 text-muted">{memberCounts[o.id] ?? 0}</td>
                <td className="p-4 text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!orgs || orgs.length === 0) && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted">
                  No organizations yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
