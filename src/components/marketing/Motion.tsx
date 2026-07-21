"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades + slides children up when scrolled into view.
 *
 * Design principle: content must NEVER depend on JavaScript succeeding to
 * become visible. The underlying elements render at full opacity always;
 * this component only adds a decorative entrance animation on top, driven by
 * IntersectionObserver + the native Web Animations API. If JS fails, is
 * blocked, or the browser lacks IntersectionObserver support, users still see
 * everything immediately with no animation — never a blank section.
 */
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
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const targets = items.length ? Array.from(items) : [el];

    const play = () => {
      if (played.current) return;
      played.current = true;
      targets.forEach((target, i) => {
        if (typeof target.animate !== "function") return;
        try {
          target.animate(
            [
              { opacity: 0, transform: `translateY(${y}px) scale(0.98)` },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            {
              duration: 500,
              delay: i * stagger * 1000,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "none",
            }
          );
        } catch {
          // Animation API unsupported or failed — content is already visible, nothing to fix.
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [stagger, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Animated counter for stat numbers. Renders the final value immediately;
 *  the count-up is a decorative enhancement layered on top when in view. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => to.toLocaleString() + suffix);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const animateCount = () => {
      if (played.current) return;
      played.current = true;
      const duration = 1400;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(to * eased).toLocaleString() + suffix);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animateCount();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, suffix]);

  return <span ref={ref}>{display}</span>;
}
