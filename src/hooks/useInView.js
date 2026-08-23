import { useEffect, useRef, useState } from 'react';

/**
 * useInView
 *
 * Fires once when the element scrolls into the viewport, then disconnects
 * (no repeated re-triggering on scroll up/down — keeps motion discreet).
 * Respects prefers-reduced-motion by reporting "in view" immediately.
 */
export default function useInView({ threshold = 0.2, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);
  // Lazy-initialized: if the user prefers reduced motion, start already
  // "in view" so no effect-time setState is needed for that branch.
  const [isInView, setIsInView] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (isInView) return; // reduced-motion case already resolved at init
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isInView, threshold, rootMargin]);

  return [ref, isInView];
}
