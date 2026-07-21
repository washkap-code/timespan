import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";

async function submitTicket(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Cap ticket submissions per user to prevent support-portal spam/flooding.
  const limitResult = rateLimit(`support-ticket:${user.id}`, 5, 60_000);
  if (!limitResult.ok) return;

  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;
  const priority = formData.get("priority") as string;
  if (!subject?.trim() || !message?.trim()) return;
  if (subject.length > 200 || message.length > 5000) return;

  await supabase.from("support_tickets").insert({
    user_id: user.id,
    subject: subject.trim().slice(0, 200),
    message: message.trim().slice(0, 5000),
    priority,
  });
  revalidatePath("/dashboard/support");
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-warning/15 text-warning",
  in_progress: "bg-accent/15 text-accent",
  resolved: "bg-success/15 text-success",
  closed: "bg-surface-2 text-muted",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id,subject,status,priority,created_at")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-muted">Submit a ticket and the TimeSpan team will get back to you.</p>

      <form action={submitTicket} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <label className="block text-sm font-medium">Subject</label>
          <input
            name="subject"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary-light"
            placeholder="e.g. Solve endpoint timing out"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea
            name="message"
            required
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary-light"
            placeholder="Describe the issue..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Priority</label>
          <select
            name="priority"
            defaultValue="normal"
            className="mt-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary-light"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <button
          type="submit"
          className="glow-ring cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
        >
          Submit ticket
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Your tickets</h2>
        <div className="mt-4 space-y-3">
          {(tickets ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium">{t.subject}</p>
                <p className="mt-1 text-xs text-muted">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}>{t.status}</span>
            </div>
          ))}
          {(!tickets || tickets.length === 0) && <p className="text-sm text-muted">No tickets submitted yet.</p>}
        </div>
      </div>
    </div>
  );
}
