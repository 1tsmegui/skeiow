import { useEffect, useRef, useState } from 'react';

/**
 * useScrollPhase
 *
 * Tracks a section's relationship to the viewport continuously (not just
 * once) so we can drive scroll-linked transitions: "isActive" while the
 * section is meaningfully in view, "isExiting" while it is being scrolled
 * past and out through the top of the viewport.
 *
 * Unlike useInView, this observer never disconnects — it keeps reporting
 * both directions so entering/leaving the section replays the transition.
 * Respects prefers-reduced-motion by staying in a static "active" state.
 */
export default function useScrollPhase({ threshold = 0.3 } = {}) {
  const ref = useRef(null);
  const [phase, setPhase] = useState({ isActive: false, isExiting: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase({ isActive: true, isExiting: false });
      return;
    }

    const steps = [0, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        const leavingThroughTop = entry.boundingClientRect.top < 0;
        setPhase({
          isActive: entry.isIntersecting && ratio > threshold,
          isExiting: leavingThroughTop && ratio < threshold,
        });
      },
      { threshold: steps }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, phase];
}
