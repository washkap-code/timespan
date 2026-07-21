import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/admin";

async function updateRoadmapStatus(formData: FormData) {
  "use server";
  const { role } = await getSessionWithRole();
  if (role !== "admin") return;

  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  await supabase.from("roadmap_requests").update({ status }).eq("id", id);
  revalidatePath("/dashboard/admin/roadmap");
}

async function createRequest(formData: FormData) {
  "use server";
  const { user, role } = await getSessionWithRole();
  if (role !== "admin" || !user) return;

  const supabase = await createClient();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  if (!title) return;
  await supabase.from("roadmap_requests").insert({ title, description, created_by: user.id });
  revalidatePath("/dashboard/admin/roadmap");
}

const STATUS_STYLE: Record<string, string> = {
  proposed: "bg-surface-2 text-muted",
  planned: "bg-accent/15 text-accent",
  building: "bg-primary/15 text-primary-light",
  shipped: "bg-success/15 text-success",
};

export default async function AdminRoadmap() {
  const supabase = await createClient();
  const [{ data: requests }, { data: votes }] = await Promise.all([
    supabase.from("roadmap_requests").select("id,title,description,status,created_at").order("created_at", { ascending: false }),
    supabase.from("roadmap_votes").select("request_id"),
  ]);

  const voteCounts = (votes ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.request_id] = (acc[v.request_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
      <p className="mt-1 text-sm text-muted">Customer-voted feature requests. Influence what ships next.</p>

      <form action={createRequest} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-muted">Title</label>
          <input
            name="title"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            placeholder="Field Service Routing API"
          />
        </div>
        <div className="flex-[2] min-w-[280px]">
          <label className="block text-xs font-medium text-muted">Description</label>
          <input
            name="description"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light"
            placeholder="What should this do?"
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Add item
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {(requests ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{r.title}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{r.description}</p>
              <p className="mt-1 text-xs text-muted">{voteCounts[r.id] ?? 0} votes</p>
            </div>
            <form action={updateRoadmapStatus} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none">
                <option value="proposed">Proposed</option>
                <option value="planned">Planned</option>
                <option value="building">Building</option>
                <option value="shipped">Shipped</option>
              </select>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-border px-3 py-1 text-xs font-medium hover:border-primary-light/50 hover:bg-surface-2"
              >
                Update
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
