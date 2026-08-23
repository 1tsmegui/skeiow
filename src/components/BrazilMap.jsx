import { useMemo } from 'react';
import { REGIONS, STATES } from './brazilData';
import './BrazilMap.css';

/**
 * BrazilMap
 *
 * Renders the 27 states colored/grouped by region, with a pulsing
 * labeled dot per region. Region borders glow via a shared SVG filter.
 *
 * Optional, off-by-default per-state interactivity: pass
 * `enableStateHighlight` to let individual states brighten on hover
 * (useful later for "leads by state" or similar overlays) without
 * changing the default region-level look anywhere it's already used.
 */
export default function BrazilMap({
  activeRegion,
  onRegionHover,
  enableStateHighlight = false,
  activeState,
  onStateHover,
}) {
  const statesByRegion = useMemo(() => {
    const grouped = {};
    for (const state of STATES) {
      (grouped[state.region] ??= []).push(state);
    }
    return grouped;
  }, []);

  return (
    <svg
      className="brazil-map"
      viewBox="0 0 613 639"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mapa do Brasil por regiao"
    >
      <defs>
        <filter id="bm-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bm-dot-glow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Object.entries(statesByRegion).map(([regionId, states]) => {
        const region = REGIONS[regionId];
        const isRegionActive = activeRegion === regionId;

        return (
          <g
            key={regionId}
            className="brazil-map__region"
            onMouseEnter={() => onRegionHover?.(regionId)}
            onMouseLeave={() => onRegionHover?.(null)}
          >
            {states.map((state) => {
              const isStateActive = enableStateHighlight && activeState === state.id;
              return (
                <path
                  key={state.id}
                  d={state.d}
                  aria-label={state.label}
                  fill={region.color}
                  fillOpacity={isStateActive ? 0.32 : isRegionActive ? 0.22 : 0.12}
                  stroke={region.color}
                  strokeWidth={isStateActive || isRegionActive ? 1.6 : 1.1}
                  strokeLinejoin="round"
                  filter="url(#bm-glow)"
                  onMouseEnter={
                    enableStateHighlight ? () => onStateHover?.(state.id) : undefined
                  }
                  onMouseLeave={enableStateHighlight ? () => onStateHover?.(null) : undefined}
                />
              );
            })}
          </g>
        );
      })}

      {Object.entries(REGIONS).map(([regionId, region], i) => (
        <g
          key={`${regionId}-marker`}
          className="brazil-map__marker"
          style={{ '--delay': `${i * 0.22}s` }}
        >
          <circle
            cx={region.dot.x}
            cy={region.dot.y}
            r="3.6"
            fill={region.color}
            filter="url(#bm-dot-glow)"
          />
          <circle
            className="brazil-map__marker-ring"
            cx={region.dot.x}
            cy={region.dot.y}
            r="3.6"
            fill="none"
            stroke={region.color}
            strokeWidth="1.3"
          />
          <text
            x={region.dot.x}
            y={region.dot.y - 12}
            className="brazil-map__label"
            fill={region.color}
            textAnchor="middle"
          >
            {region.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
