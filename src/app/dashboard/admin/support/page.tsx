import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/admin";

async function updateStatus(formData: FormData) {
  "use server";
  const { role } = await getSessionWithRole();
  if (role !== "admin") return;

  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/dashboard/admin/support");
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-warning/15 text-warning",
  in_progress: "bg-accent/15 text-accent",
  resolved: "bg-success/15 text-success",
  closed: "bg-surface-2 text-muted",
};

export default async function AdminSupport() {
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id,subject,message,status,priority,created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-muted">Tickets submitted by customers across the platform.</p>

      <div className="mt-6 space-y-4">
        {(tickets ?? []).map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{t.subject}</h3>
                <p className="mt-1 text-sm text-muted">{t.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(t.created_at).toLocaleString()} · priority: {t.priority}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                <form action={updateStatus} className="flex gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <select
                    name="status"
                    defaultValue={t.status}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg border border-border px-3 py-1 text-xs font-medium hover:border-primary-light/50 hover:bg-surface-2"
                  >
                    Update
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {(!tickets || tickets.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
            No support tickets yet.
          </div>
        )}
      </div>
    </div>
  );
}
