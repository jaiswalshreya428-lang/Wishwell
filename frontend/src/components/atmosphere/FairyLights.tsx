import React from 'react';
import { useReducedMotion } from 'framer-motion';

interface FairyLightsProps {
  className?: string;
  bulbCount?: number;
}

/**
 * A string of fairy lights dangling gently across the hero section.
 * Rendered using lightweight SVG catenary curves and staggered twinkling bulbs.
 * Respects prefers-reduced-motion by keeping bulbs statically lit without animations.
 */
export const FairyLights: React.FC<FairyLightsProps> = ({
  className = '',
  bulbCount = 14,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Generate evenly spaced points along the catenary curve
  // Parabolic sag y = 4 * sag * (x / width) * (1 - x / width)
  const width = 1000;
  const sag = 28;
  const baseY = 8;

  const bulbs = Array.from({ length: bulbCount }).map((_, i) => {
    const t = (i + 0.5) / bulbCount;
    const x = t * width;
    const y = baseY + 4 * sag * t * (1 - t);
    // Alternate warm colors: Marigold (#F2B441), Warm Amber (#E09823), Soft Terracotta (#D77D5E), Golden Cream (#FDF2D5)
    const colors = ['#F2B441', '#E09823', '#FDF2D5', '#F2B441', '#D77D5E'];
    const color = colors[i % colors.length];
    const delay = (i * 0.23) % 2.4;
    const duration = 2.2 + (i % 3) * 0.4;

    return { x, y, color, delay, duration };
  });

  // SVG path for the hanging wire
  // Bezier curve sagging down to center
  const wirePath = `M 0,${baseY} Q ${width / 2},${baseY + sag * 1.5} ${width},${baseY}`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible w-full ${className}`}
    >
      <svg
        viewBox={`0 0 ${width} 52`}
        className="w-full h-10 sm:h-12 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="bulb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hanging wire */}
        <path
          d={wirePath}
          stroke="#47403A"
          strokeWidth="1.25"
          strokeDasharray="2 1"
          opacity="0.5"
          fill="none"
        />

        {/* Bulbs and little socket caps */}
        {bulbs.map((b, idx) => (
          <g key={idx} transform={`translate(${b.x}, ${b.y})`}>
            {/* Socket cap */}
            <rect x="-1.5" y="-1" width="3" height="3" rx="0.5" fill="#2C2622" />
            {/* Tiny drop cord */}
            <line x1="0" y1="2" x2="0" y2="4" stroke="#47403A" strokeWidth="1" />

            {/* Glowing Bulb */}
            <circle
              cx="0"
              cy="8"
              r="4"
              fill={b.color}
              filter="url(#bulb-glow)"
              style={
                shouldReduceMotion
                  ? { opacity: 0.9 }
                  : {
                      animation: `fairy-twinkle ${b.duration}s ease-in-out infinite`,
                      animationDelay: `${b.delay}s`,
                    }
              }
            />

            {/* Bright filament core */}
            <circle
              cx="0"
              cy="8"
              r="1.8"
              fill="#FFFFFF"
              opacity="0.8"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

