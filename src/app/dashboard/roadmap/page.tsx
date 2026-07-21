import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function toggleVote(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const requestId = formData.get("requestId") as string;
  const hasVoted = formData.get("hasVoted") === "true";

  if (hasVoted) {
    await supabase.from("roadmap_votes").delete().eq("request_id", requestId).eq("user_id", user.id);
  } else {
    await supabase.from("roadmap_votes").insert({ request_id: requestId, user_id: user.id });
  }
  revalidatePath("/dashboard/roadmap");
}

const STATUS_STYLE: Record<string, string> = {
  proposed: "bg-surface-2 text-muted",
  planned: "bg-accent/15 text-accent",
  building: "bg-primary/15 text-primary-light",
  shipped: "bg-success/15 text-success",
};

export default async function RoadmapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: requests }, { data: votes }] = await Promise.all([
    supabase.from("roadmap_requests").select("id,title,description,status,created_at").order("created_at", { ascending: false }),
    supabase.from("roadmap_votes").select("request_id,user_id"),
  ]);

  const voteCounts = (votes ?? []).reduce<Record<string, number>>((acc, v) => {
    acc[v.request_id] = (acc[v.request_id] ?? 0) + 1;
    return acc;
  }, {});
  const myVotes = new Set((votes ?? []).filter((v) => v.user_id === user?.id).map((v) => v.request_id));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
      <p className="mt-1 text-sm text-muted">Vote on what TimeSpan builds next.</p>

      <div className="mt-6 space-y-3">
        {(requests ?? []).map((r) => {
          const hasVoted = myVotes.has(r.id);
          return (
            <div key={r.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{r.title}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{r.description}</p>
              </div>
              <form action={toggleVote}>
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="hasVoted" value={String(hasVoted)} />
                <button
                  type="submit"
                  className={`flex cursor-pointer flex-col items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    hasVoted ? "border-primary bg-primary/15 text-primary-light" : "border-border hover:border-primary-light/50 hover:bg-surface-2"
                  }`}
                >
                  <span>▲</span>
                  {voteCounts[r.id] ?? 0}
                </button>
              </form>
            </div>
          );
        })}
        {(!requests || requests.length === 0) && <p className="text-sm text-muted">No roadmap items yet.</p>}
      </div>
    </div>
  );
}
