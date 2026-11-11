import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Petal {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  swayOffset: number;
  color: string;
  alpha: number;
}

/**
 * Classy Anime Blossom Petals Canvas:
 * Subtle, restrained almond/sakura blossom petals drifting peacefully through the hero breeze
 * in muted vintage ivory, rosewater blush, and champagne gold tones.
 */
export const AnimePetalsCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || shouldReduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let isVisible = true;
    let isTabActive = !document.hidden;

    const count = window.innerWidth < 768 ? 5 : 12;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const palette = ['#FAF5E8', '#EBC8BE', '#E5D1A2', '#F3DED8'];
    const petals: Petal[] = Array.from({ length: count }).map((_, idx) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 4 + Math.random() * 4.5,
      vx: 0.25 + Math.random() * 0.45,
      vy: 0.35 + Math.random() * 0.45,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.025,
      swayOffset: Math.random() * Math.PI * 2,
      color: palette[idx % palette.length],
      alpha: 0.38 + Math.random() * 0.35,
    }));

    let frame = 0;

    const render = () => {
      if (!isVisible || !isTabActive) {
        animId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);
      frame++;

      for (const p of petals) {
        p.x += p.vx + Math.sin(frame * 0.015 + p.swayOffset) * 0.35;
        p.y += p.vy;
        p.angle += p.spin;

        if (p.y > height + 16) {
          p.y = -12;
          p.x = Math.random() * width;
        }
        if (p.x > width + 16) {
          p.x = -12;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size * 0.85, -p.size * 0.4, p.size * 0.75, p.size * 0.75, 0, p.size);
        ctx.bezierCurveTo(-p.size * 0.75, p.size * 0.75, -p.size * 0.85, -p.size * 0.4, 0, -p.size);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    const start = () => {
      if (!animId && isVisible && isTabActive) {
        animId = requestAnimationFrame(render);
      }
    };

    const stop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const onVisibility = () => {
      isTabActive = !document.hidden;
      if (isTabActive && isVisible) start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    start();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

