"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, useInView } from "./useInView";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 1200,
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.3 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      const t = setTimeout(() => setValue(target), 0);
      return () => clearTimeout(t);
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
