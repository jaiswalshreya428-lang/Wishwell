import React from 'react';

/**
 * Paper-grain texture overlay.
 * Uses an SVG feTurbulence data URI at ~8.5% opacity with mix-blend-multiply.
 * Creates a cozy, tactile handmade paper feel across light areas
 * and adds subtle celestial depth without reducing WCAG AA text contrast.
 */
export const PaperGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.085 }) => {
  // SVG feTurbulence noise as an inline data-URI for zero HTTP requests and high GPU performance
  const noiseSvg =
    "data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.8'/%3E%3C/svg%3E";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 bg-repeat mix-blend-multiply select-none"
      style={{
        backgroundImage: `url("${noiseSvg}")`,
        opacity,
      }}
    />
  );
};
