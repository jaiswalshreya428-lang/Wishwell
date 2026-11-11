import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * Paper-Cut Skyline:
 * 3 layered SVG hills with tiny house silhouettes and warm glowing windows,
 * creating depth and a "warm home at dusk" atmosphere with subtle scroll parallax.
 * Automatically simplifies on mobile (< 768px).
 */
export const PaperCutSkyline: React.FC<{ className?: string }> = ({ className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Subtle scroll parallax for the 3 papercut layers (desktop only)
  const yBack = useTransform(scrollY, [0, 600], [0, shouldReduceMotion ? 0 : 25]);
  const yMiddle = useTransform(scrollY, [0, 600], [0, shouldReduceMotion ? 0 : 50]);
  const yFront = useTransform(scrollY, [0, 600], [0, shouldReduceMotion ? 0 : 75]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative w-full overflow-hidden select-none ${className}`}
      style={{ height: '140px' }}
    >
      {/* ======================================================== */}
      {/* LAYER 1: Distant hills & silhouetted trees (Back layer)  */}
      {/* ======================================================== */}
      <motion.div
        style={{ y: yBack }}
        className="absolute inset-0 w-full h-full flex items-end"
      >
        <svg
          viewBox="0 0 1440 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Distant soft hill */}
          <path
            d="M0 80C240 50 480 95 720 65C960 35 1200 70 1440 50V140H0V80Z"
            fill="#F6ECE1"
            opacity="0.85"
          />
          {/* Distant tiny trees & pines */}
          <path d="M180 58L186 70H174L180 58Z" fill="#D8C3AC" />
          <path d="M192 61L197 71H187L192 61Z" fill="#D8C3AC" />
          <path d="M840 52L846 64H834L840 52Z" fill="#D8C3AC" />
          <path d="M1220 54L1226 66H1214L1220 54Z" fill="#D8C3AC" />
        </svg>
      </motion.div>

      {/* ======================================================== */}
      {/* LAYER 2: Middle hill with cozy homes & glowing windows    */}
      {/* ======================================================== */}
      <motion.div
        style={{ y: yMiddle }}
        className="absolute inset-0 w-full h-full flex items-end"
      >
        <svg
          viewBox="0 0 1440 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Middle undulating ridge */}
          <path
            d="M0 95C280 75 520 110 800 80C1080 50 1300 85 1440 75V140H0V95Z"
            fill="#EADCCB"
          />

          {/* House 1 (Left): Small shelter with chimney & warm glowing window */}
          <g transform="translate(120, 58)">
            <rect x="0" y="16" width="28" height="24" rx="2" fill="#C4552F" />
            <path d="M-4 17L14 3L32 17H-4Z" fill="#9E3F1F" />
            <rect x="20" y="6" width="4" height="10" fill="#80331A" />
            {/* Glowing window */}
            <rect x="7" y="23" width="7" height="8" rx="1" fill="#F2B441" />
            <rect x="17" y="23" width="7" height="8" rx="1" fill="#F2B441" />
          </g>

          {/* House 2 (Center-Left): Children's Home with double roof */}
          <g transform="translate(420, 64)">
            <rect x="0" y="14" width="36" height="26" rx="2" fill="#1F5C57" />
            <path d="M-4 15L18 0L40 15H-4Z" fill="#184945" />
            <rect x="6" y="4" width="5" height="11" fill="#133936" />
            {/* Windows glowing with dusk light */}
            <rect x="6" y="20" width="8" height="9" rx="1" fill="#F2B441" />
            <rect x="22" y="20" width="8" height="9" rx="1" fill="#F2B441" />
            <rect x="15" y="28" width="6" height="12" rx="1" fill="#FDF8F1" />
          </g>

          {/* House 3 (Center-Right): Warm cottage */}
          <g transform="translate(980, 52)">
            <rect x="0" y="14" width="30" height="24" rx="2" fill="#C4552F" />
            <path d="M-3 15L15 2L33 15H-3Z" fill="#9E3F1F" />
            {/* Glowing warm window */}
            <rect x="8" y="21" width="8" height="8" rx="1" fill="#F2B441" />
            <rect x="19" y="21" width="5" height="10" rx="1" fill="#FDF2D5" />
          </g>

          {/* House 4 (Right): Small community house */}
          <g transform="translate(1310, 60)">
            <rect x="0" y="14" width="26" height="22" rx="2" fill="#2E7972" />
            <path d="M-3 15L13 3L29 15H-3Z" fill="#1F5C57" />
            <rect x="7" y="20" width="6" height="7" rx="1" fill="#F2B441" />
          </g>
        </svg>
      </motion.div>

      {/* ======================================================== */}
      {/* LAYER 3: Foreground hill blending into page background  */}
      {/* ======================================================== */}
      <motion.div
        style={{ y: yFront }}
        className="absolute inset-0 w-full h-full flex items-end"
      >
        <svg
          viewBox="0 0 1440 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Foreground rolling curve matching #FDF8F1 base surface */}
          <path
            d="M0 115C360 90 720 130 1080 105C1240 92 1360 108 1440 100V140H0V115Z"
            fill="#FDF8F1"
          />
          {/* Subtle paper-cut shadow line */}
          <path
            d="M0 115C360 90 720 130 1080 105C1240 92 1360 108 1440 100"
            stroke="#EADCCB"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
};

