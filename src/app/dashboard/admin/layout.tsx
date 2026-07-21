import { redirect } from "next/navigation";
import { getSessionWithRole } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getSessionWithRole();
  if (!user) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
          Admin
        </span>
        <span className="text-sm text-muted">Platform administration — visible only to admin accounts.</span>
      </div>
      {children}
    </div>
  );
}
