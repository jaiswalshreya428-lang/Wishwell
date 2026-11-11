import React from 'react';
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion';

/**
 * Thin scroll-progress bar fixed at the top of the viewport.
 * Uses warm terracotta-to-marigold gradient.
 * Respects prefers-reduced-motion by remaining hidden or static.
 */
export const ScrollProgressBar: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#215B54] via-[#C69749] to-[#A84637] origin-left z-50 pointer-events-none"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
};

