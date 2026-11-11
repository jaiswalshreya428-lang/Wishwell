import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SuccessBurstProps {
  onComplete?: () => void;
  message?: string;
  durationMs?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  shape: 'circle' | 'heart' | 'star';
  scale: number;
  rotate: number;
}

/**
 * 1.2-second joyous success moment:
 * Flings small confetti petals and hearts outward with a smooth checkmark check.
 * Self-terminates under 1.5s as requested.
 */
export const SuccessBurst: React.FC<SuccessBurstProps> = ({
  onComplete,
  message = 'Confirmed Successfully!',
  durationMs = 1300,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (shouldReduceMotion) {
      const timer = setTimeout(() => onComplete?.(), durationMs);
      return () => clearTimeout(timer);
    }

    const colors = ['#C4552F', '#F2B441', '#1F5C57', '#FDF2D5', '#9E3F1F'];
    const count = 18;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = 45 + Math.random() * 55;
      newParticles.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        r: 3 + Math.random() * 3,
        color: colors[i % colors.length],
        shape: i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'circle' : 'star',
        scale: 0.6 + Math.random() * 0.6,
        rotate: Math.random() * 360,
      });
    }

    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onComplete, shouldReduceMotion]);

  return (
    <div className="relative inline-flex flex-col items-center justify-center p-4">
      {/* Central animated check badge */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200 }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-teal flex items-center justify-center z-10"
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Check className="w-8 h-8 stroke-[3]" />
        </motion.div>
      </motion.div>

      {/* Confetti & heart burst particles */}
      {!shouldReduceMotion &&
        particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: p.scale,
              opacity: [1, 1, 0],
              rotate: p.rotate,
            }}
            transition={{
              duration: 1.05,
              ease: [0.18, 0.89, 0.32, 1.28],
            }}
            className="absolute pointer-events-none"
            style={{ color: p.color }}
          >
            {p.shape === 'heart' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={p.color}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : p.shape === 'star' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill={p.color}>
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: p.r * 2,
                  height: p.r * 2,
                  backgroundColor: p.color,
                }}
              />
            )}
          </motion.div>
        ))}

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="font-serif font-bold text-sm text-ink-900 mt-3 text-center"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

