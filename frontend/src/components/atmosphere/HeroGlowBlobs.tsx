import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Animated Hero Background Glow:
 * 1. Layered slowly drifting soft gradient blobs in terracotta, marigold and cream (20-40s pure transform loops).
 * 2. "Lamp glow": Warm radial light that gently breathes and shifts slightly towards cursor on desktop.
 */
export const HeroGlowBlobs: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Desktop only mouse parallax (< 768px disabled)
    if (shouldReduceMotion || typeof window === 'undefined' || window.innerWidth < 768) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Normalized between -1 and 1
      const nx = (e.clientX / innerWidth - 0.5) * 2;
      const ny = (e.clientY / innerHeight - 0.5) * 2;
      // Gentle shift: max 24px
      setMouseOffset({ x: nx * 24, y: ny * 20 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [shouldReduceMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Blob 1: Soothing light sky blue, drifting top-left (28s loop) */}
      <div
        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-40 bg-gradient-to-br from-sky-200 via-sky-100 to-transparent animate-drift-slow"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Blob 2: Soothing light mint/sage green, drifting top-right (36s loop) */}
      <div
        className="absolute -top-20 -right-28 w-[600px] h-[560px] rounded-full blur-3xl opacity-35 bg-gradient-to-bl from-emerald-100 via-teal-100 to-transparent animate-drift-medium"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Blob 3: Soft airy sky-mint center-depth (32s loop) */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full blur-3xl opacity-30 bg-gradient-to-t from-teal-50 via-sky-50 to-transparent animate-drift-reverse"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Breathing Ambient Glow: Calming, serene sky-blue & seafoam glow that gently tracks mouse */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { x: 0, y: 0 }
            : {
                x: mouseOffset.x,
                y: mouseOffset.y,
              }
        }
        transition={{ type: 'spring', damping: 25, stiffness: 60 }}
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] sm:w-[850px] h-[500px] rounded-full pointer-events-none blur-2xl animate-lamp-glow"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.18) 0%, rgba(45, 212, 191, 0.14) 45%, rgba(240, 249, 255, 0) 75%)',
        }}
      />
    </div>
  );
};

