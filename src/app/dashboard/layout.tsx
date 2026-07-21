"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/scheduler", label: "Shift Scheduler" },
  { href: "/dashboard/tasks", label: "Task Scheduler" },
  { href: "/dashboard/roadmap", label: "Roadmap" },
  { href: "/dashboard/support", label: "Support" },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Admin overview" },
  { href: "/dashboard/admin/datasets", label: "Datasets" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/organizations", label: "Organizations" },
  { href: "/dashboard/admin/plans", label: "Plans & billing" },
  { href: "/dashboard/admin/support", label: "Support" },
  { href: "/dashboard/admin/roadmap", label: "Roadmap" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 flex w-60 flex-col border-r border-border bg-surface p-5">
        <Link href="/" className="mb-8 cursor-pointer">
          <Logo size={26} />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                pathname === n.href
                  ? "bg-primary/15 font-medium text-primary-light"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <p className="mb-1.5 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/70">Admin</p>
        <nav className="flex flex-col gap-1">
          {adminNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                pathname === n.href
                  ? "bg-accent/15 font-medium text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
        >
          Sign out
        </button>
      </aside>
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}
