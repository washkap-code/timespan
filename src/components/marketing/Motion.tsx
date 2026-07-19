"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Fades + slides children up on scroll, with a grid-aware stagger. */
export function Reveal({
  children,
  className = "",
  stagger = 0.06,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const targets = items.length ? items : [el];
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y,
        scale: 0.98,
        duration: 0.5,
        stagger: { each: stagger, from: "start" },
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: el, start: "top 82%" },
      });
    }, el);
    return () => ctx.revert();
  }, [stagger, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Animated counter for stat numbers. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: to,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString() + suffix;
      },
    });
    return () => {
      tween.kill();
    };
  }, [to, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}
