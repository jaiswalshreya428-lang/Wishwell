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
 * Reusable "Twilight Home" Page Header Band for Dashboard & Work Screens
 * (Browse, Admin, Verifier, Institution, Donor).
 * Features:
 * - Night Indigo (#231F3D) to Deep Plum (#3A2A55) backdrop
 * - Gentle breathing marigold lamp glow
 * - Slow fireflies canvas (max 10 particles desktop, 5 mobile)
 * - Paper-cut skyline strip nestled at the bottom of the band
 * - Accessible high-contrast cream typography meeting WCAG AA
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
      style={{ backgroundColor: '#231F3D' }}
      className="relative bg-[#231F3D] bg-gradient-to-b from-[#1C1832] via-[#231F3D] to-[#2B2344] text-[#FFFBF5] pt-10 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-night dark-starry-bg border-b border-[#3A2A55]/70"
    >
      {/* 1. Subtle Marigold Breathing Lamp Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/4 w-[480px] h-[300px] rounded-full bg-gradient-to-br from-[#F6B93B]/20 via-[#E4572E]/10 to-transparent blur-3xl animate-lamp-glow"
        style={{ transform: shouldReduceMotion ? 'none' : undefined }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-10 w-[360px] h-[260px] rounded-full bg-gradient-to-bl from-[#3A2A55]/40 via-[#F6B93B]/10 to-transparent blur-3xl"
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
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3A2A55]/80 text-[#F6B93B] border border-[#F6B93B]/30 text-xs font-semibold tracking-wide uppercase shadow-sm backdrop-blur-sm"
              >
                {badgeIcon}
                <span>{badge}</span>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F6B93B] drop-shadow-md"
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-sm sm:text-base text-[#E6E0F0] leading-relaxed max-w-2xl font-normal"
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
            className="mt-6 pt-5 border-t border-[#3A2A55]/70 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#2A2346]/60 backdrop-blur-sm border border-[#3A2A55] rounded-2xl px-4 py-3 shadow-inner"
              >
                <span className="block text-[11px] font-semibold text-[#A89EB8] uppercase tracking-wider">
                  {s.label}
                </span>
                <span className="block font-serif text-2xl font-bold text-[#FFFBF5] mt-1 font-feature-tabular">
                  {s.value}
                </span>
                {s.helper && (
                  <span className="block text-[10px] text-[#F6B93B] mt-0.5 font-medium">
                    {s.helper}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {children && <div className="mt-6 pt-4 border-t border-[#3A2A55]/60">{children}</div>}
      </div>

      {/* 4. Mini Paper-Cut Skyline Strip Along Bottom of Header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-60 select-none z-0"
      >
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Back small hills */}
          <path d="M0 35C240 18 520 40 760 22C1000 8 1240 30 1440 20V60H0V35Z" fill="#141224" opacity="0.7" />
          {/* Front dark silhouette with tiny glowing windows */}
          <path d="M0 45C300 30 600 50 900 35C1200 20 1350 45 1440 38V60H0V45Z" fill="#141224" />
          {/* House 1 */}
          <rect x="220" y="32" width="14" height="13" fill="#141224" />
          <polygon points="218,32 227,24 236,32" fill="#141224" />
          <rect x="224" y="36" width="3" height="4" fill="#F6B93B" opacity="0.9" />
          {/* House 2 */}
          <rect x="680" y="30" width="16" height="15" fill="#141224" />
          <polygon points="678,30 688,20 698,30" fill="#141224" />
          <rect x="684" y="35" width="4" height="4" fill="#F6B93B" opacity="0.85" />
          {/* House 3 */}
          <rect x="1140" y="28" width="14" height="16" fill="#141224" />
          <polygon points="1138,28 1147,19 1156,28" fill="#141224" />
          <rect x="1143" y="34" width="3.5" height="4" fill="#F6B93B" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
};
