"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/#products", label: "Products" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-3" : "bg-transparent py-5"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link href="/" className="cursor-pointer" aria-label="TimeSpan home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="cursor-pointer text-sm text-muted transition-colors duration-200 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-muted transition-colors duration-200 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="glow-ring cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Launch platform
          </Link>
        </div>
      </nav>
    </header>
  );
}
