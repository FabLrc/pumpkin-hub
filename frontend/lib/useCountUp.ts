"use client";

import { useState, useEffect, useRef } from "react";

const hasIntersectionObserver = typeof IntersectionObserver !== "undefined";

/** Returns a ref to attach to a container and a boolean indicating if it's in view.
 *  In environments without IntersectionObserver (SSR, jsdom), always in view. */
export function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!hasIntersectionObserver);

  useEffect(() => {
    if (!hasIntersectionObserver) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]!;
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Animates from 0 to target when inView becomes true.
 *  In environments without IntersectionObserver (tests/SSR), returns target immediately. */
export function useCountUp(target: number, inView: boolean, duration = 1500): number {
  // Skip animation in environments that have no IntersectionObserver (e.g. jsdom)
  const [count, setCount] = useState(!hasIntersectionObserver ? target : 0);
  const animatedRef = useRef(false);

  // Keep count in sync when target changes in no-IO environments
  useEffect(() => {
    if (!hasIntersectionObserver) {
      setCount(target);
    }
  }, [target]);

  useEffect(() => {
    if (!hasIntersectionObserver) return;
    if (!inView || target <= 0 || animatedRef.current) return;
    animatedRef.current = true;

    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return count;
}
