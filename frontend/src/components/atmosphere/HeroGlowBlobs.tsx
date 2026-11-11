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
      {/* Blob 1: Soothing misty morning sky & celadon water, drifting top-left (28s loop) */}
      <div
        className="absolute -top-32 -left-32 w-[540px] h-[540px] rounded-full blur-3xl opacity-55 bg-gradient-to-br from-[#BFE2E4] via-[#DCEEE9] to-transparent animate-drift-slow"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Blob 2: Soft petal-cream & honey sunlight glow, drifting top-right (36s loop) */}
      <div
        className="absolute -top-20 -right-28 w-[600px] h-[560px] rounded-full blur-3xl opacity-45 bg-gradient-to-bl from-[#F8EED8] via-[#E3F1EA] to-transparent animate-drift-medium"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Blob 3: Soft mineral meadow & seafoam mist depth (32s loop) */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[720px] h-[480px] rounded-full blur-3xl opacity-45 bg-gradient-to-t from-[#D4EAE2] via-[#EFF5F1] to-transparent animate-drift-reverse"
        style={{
          transform: shouldReduceMotion ? 'none' : undefined,
        }}
      />

      {/* Breathing Ambient Glow: Calm mineral aqua & warm lantern halo that tracks cursor */}
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
            'radial-gradient(ellipse at center, rgba(132, 198, 192, 0.22) 0%, rgba(226, 196, 134, 0.12) 45%, rgba(239, 245, 241, 0) 75%)',
        }}
      />
    </div>
  );
};

