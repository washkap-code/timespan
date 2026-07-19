"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3ElGe2DKz4uM8bNdNIuLQ1fI9mR/hf_20260719_171449_754d1117-89dd-4c24-990d-3f0e2b1eac84.mp4";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 28,
        duration: 0.7,
        stagger: 0.12,
        ease: "expo.out",
        delay: 0.15,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="relative flex min-h-screen items-center overflow-hidden">
      {/* Motion background */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        src={HERO_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-20">
        <p
          data-hero
          className="mb-5 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-light"
        >
          Developer platform for scheduling optimization
        </p>
        <h1 data-hero className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Scheduling that <span className="text-gradient">solves itself</span>
        </h1>
        <p data-hero className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
          Plug production-grade optimization into your software via REST. Shifts, routes,
          tasks and jobs — real-world constraints, constant change, enterprise scale.
        </p>
        <div data-hero className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/login?mode=signup"
            className="glow-ring cursor-pointer rounded-xl bg-primary px-7 py-3.5 font-semibold text-white transition-all duration-200 hover:bg-primary-dark"
          >
            Explore the platform
          </Link>
          <a
            href="#how-it-works"
            className="cursor-pointer rounded-xl border border-border px-7 py-3.5 font-semibold text-foreground transition-all duration-200 hover:border-primary-light/50 hover:bg-surface"
          >
            See how it works
          </a>
        </div>
        <p data-hero className="mt-8 font-mono text-xs text-muted">
          JSON in → optimized schedule out / No solver expertise required / 99.99% uptime
        </p>
      </div>
    </section>
  );
}
