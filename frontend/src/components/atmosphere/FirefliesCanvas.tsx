import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface FirefliesProps {
  className?: string;
  maxParticlesDesktop?: number;
  maxParticlesMobile?: number;
  speedMultiplier?: number;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  vy: number;
  swaySpeed: number;
  swayAmp: number;
  swayOffset: number;
  colorType: 'marigold' | 'amber' | 'gold';
}

/**
 * Lightweight Canvas Fireflies / Dust Motes component.
 * Drifts upward with gentle sinusoidal sway and soft marigold twinkling.
 * Automatically throttles to 10 particles on mobile, and completely pauses when off-screen or backgrounded.
 */
export const FirefliesCanvas: React.FC<FirefliesProps> = ({
  className = '',
  maxParticlesDesktop = 25,
  maxParticlesMobile = 10,
  speedMultiplier = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || shouldReduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isVisible = true;
    let isTabActive = !document.hidden;

    // Determine particle count based on screen width
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? maxParticlesMobile : maxParticlesDesktop;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.2 + Math.random() * 1.5,
        baseAlpha: 0.3 + Math.random() * 0.4,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        pulseOffset: Math.random() * Math.PI * 2,
        vy: (0.2 + Math.random() * 0.45) * speedMultiplier,
        swaySpeed: 0.012 + Math.random() * 0.02,
        swayAmp: 0.4 + Math.random() * 0.8,
        swayOffset: Math.random() * Math.PI * 2,
        colorType: i % 3 === 0 ? 'amber' : i % 3 === 1 ? 'gold' : 'marigold',
      });
    }

    let frame = 0;

    const render = () => {
      if (!isVisible || !isTabActive) {
        animationFrameId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);
      frame++;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particle upward
        p.y -= p.vy;
        p.x += Math.sin(frame * p.swaySpeed + p.swayOffset) * p.swayAmp;

        // Wrap around when particle escapes top or boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Calculate pulsating twinkle alpha
        const pulse = Math.sin(frame * p.pulseSpeed + p.pulseOffset);
        const currentAlpha = Math.max(0.05, Math.min(0.9, p.baseAlpha + pulse * 0.35));

        // Soft warm colors
        let r = 242,
          g = 180,
          b = 65; // Marigold
        if (p.colorType === 'amber') {
          r = 224;
          g = 152;
          b = 35;
        } else if (p.colorType === 'gold') {
          r = 251;
          g = 226;
          b = 166;
        }

        // Draw soft outer glow
        const glowRadius = p.radius * 3.5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentAlpha})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.35})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright central core
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const startAnimation = () => {
      if (!animationFrameId && isVisible && isTabActive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    // IntersectionObserver: Pause when hero is scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // VisibilityChange: Pause when user switches tabs
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      if (isTabActive && isVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Resize Handler
    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial start
    startAnimation();

    return () => {
      stopAnimation();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [shouldReduceMotion, maxParticlesDesktop, maxParticlesMobile, speedMultiplier]);

  if (shouldReduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

