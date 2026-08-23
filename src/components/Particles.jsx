import { useMemo } from 'react';
import './Particles.css';

const COLORS = ['var(--brand-purple)', 'var(--brand-pink)'];

// Deterministic pseudo-random generator so particle layout is stable across
// re-renders of the same instance without relying on Math.random() re-runs.
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildDots(count, seedOffset) {
  return Array.from({ length: count }).map((_, i) => {
    const seed = (i + 1) * 13.37 + seedOffset;
    const left = seededRandom(seed) * 100;
    const top = seededRandom(seed * 1.7) * 100;
    const size = 2 + seededRandom(seed * 2.3) * 3.5;
    const duration = 6 + seededRandom(seed * 3.1) * 8;
    const delay = seededRandom(seed * 4.7) * -14;
    const color = COLORS[i % 2];
    return { id: i, left, top, size, duration, delay, color };
  });
}

/**
 * Particles
 *
 * Lightweight CSS-only floating neon dots (purple/pink), used to unify the
 * static image sections with the ambient motion of the video sections.
 * `variant="intense"` renders more, brighter dots for the CTA highlight.
 */
export default function Particles({ variant = 'subtle', seed = 0, className = '' }) {
  const count = variant === 'intense' ? 34 : 16;
  const dots = useMemo(() => buildDots(count, seed), [count, seed]);

  return (
    <div
      className={`particles particles--${variant}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="particles__dot"
          style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            background: dot.color,
            color: dot.color,
            animationDuration: `${dot.duration}s`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
