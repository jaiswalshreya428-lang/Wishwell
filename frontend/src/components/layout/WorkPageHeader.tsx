import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FirefliesCanvas } from '../atmosphere/FirefliesCanvas';

export interface WorkPageHeaderStat {
  label: string;
  value: string | number;
  helper?: string;
}

interface WorkPageHeaderProps {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  stats?: WorkPageHeaderStat[];
  children?: React.ReactNode;
}

/**
 * Reusable Soothing Light Blue & Light Green Page Header Band for Work Screens
 * (Browse, Admin, Verifier, Institution, Donor).
 * Features:
 * - Soothing sky-blue to morning sage green gradient (#EFF6FC to #E8F4F1)
 * - Gentle ambient airy cyan / seafoam glow
 * - Slow fireflies / floating dust motes (max 10 particles desktop, 5 mobile)
 * - Paper-cut skyline strip nestled at the bottom of the band
 * - Accessible high-contrast deep slate (#0F172A) typography meeting WCAG AA
 */
export const WorkPageHeader: React.FC<WorkPageHeaderProps> = ({
  badge,
  badgeIcon,
  title,
  subtitle,
  actions,
  action,
  stats,
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const effectiveActions = actions || action;

  return (
    <div
      style={{ backgroundColor: '#DFEEF2' }}
      className="relative bg-[#DFEEF2] bg-gradient-to-b from-[#DFEEF2] via-[#EAF3EE] to-[#EFF5F1] text-[#192D2A] pt-10 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-xs border-b border-[#C5DAD7]"
    >
      {/* 1. Subtle Misty Sage & Warm Brass Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/4 w-[480px] h-[300px] rounded-full bg-gradient-to-br from-[#215B54]/15 via-[#C69749]/12 to-transparent blur-3xl animate-lamp-glow"
        style={{ transform: shouldReduceMotion ? 'none' : undefined }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-10 w-[360px] h-[260px] rounded-full bg-gradient-to-bl from-[#C69749]/14 via-[#215B54]/10 to-transparent blur-3xl"
      />

      {/* 2. Slow Fireflies (Max 10 particles on desktop, 5 on mobile) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <FirefliesCanvas
          maxParticlesDesktop={10}
          maxParticlesMobile={5}
          speedMultiplier={0.65}
        />
      </div>

      {/* 3. Main Header Content */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            {badge && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF9F3]/95 text-[#1B4D48] border border-[#C4D4CA] text-xs font-semibold tracking-wide uppercase shadow-xs backdrop-blur-sm"
              >
                {badgeIcon}
                <span>{badge}</span>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1D2927]"
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-sm sm:text-base text-[#3D4D49] leading-relaxed max-w-2xl font-normal"
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          {effectiveActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0"
            >
              {effectiveActions}
            </motion.div>
          )}
        </div>

        {/* Optional Stats Highlights */}
        {stats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="mt-6 pt-5 border-t border-[#C7D6CD] grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#FBF9F3]/95 backdrop-blur-sm border border-[#D4CAB0] rounded-2xl px-4 py-3 shadow-xs"
              >
                <span className="block text-[11px] font-semibold text-[#53645F] uppercase tracking-wider">
                  {s.label}
                </span>
                <span className="block font-serif text-2xl font-bold text-[#1D2927] mt-1 font-feature-tabular">
                  {s.value}
                </span>
                {s.helper && (
                  <span className="block text-[10px] text-[#24635C] mt-0.5 font-medium">
                    {s.helper}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {children && <div className="mt-6 pt-4 border-t border-[#C7D6CD]">{children}</div>}
      </div>

      {/* 4. Mini Paper-Cut Skylines with Wishing Well Silhouette Along Bottom of Header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-45 select-none z-0"
      >
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Back small hills */}
          <path d="M0 35C240 18 520 40 760 22C1000 8 1240 30 1440 20V60H0V35Z" fill="#C4D6CD" opacity="0.7" />
          {/* Front silhouette */}
          <path d="M0 45C300 30 600 50 900 35C1200 20 1350 45 1440 38V60H0V45Z" fill="#AFC6BA" />
          {/* House 1 */}
          <rect x="220" y="32" width="14" height="13" fill="#9BB5A8" />
          <polygon points="218,32 227,24 236,32" fill="#9BB5A8" />
          <rect x="224" y="36" width="3" height="4" fill="#C89238" opacity="0.9" />
          {/* Miniature Well Silhouette */}
          <rect x="680" y="30" width="16" height="15" fill="#9BB5A8" />
          <polygon points="678,30 688,20 698,30" fill="#9BB5A8" />
          <rect x="684" y="35" width="4" height="4" fill="#DFBF72" opacity="0.9" />
          {/* House 3 */}
          <rect x="1140" y="28" width="14" height="16" fill="#9BB5A8" />
          <polygon points="1138,28 1147,19 1156,28" fill="#9BB5A8" />
          <rect x="1143" y="34" width="3.5" height="4" fill="#C89238" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
};
