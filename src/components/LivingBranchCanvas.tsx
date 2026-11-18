import React, { useEffect, useRef } from 'react';
import { InkRibbonPoint } from '../utils/botanicalInk';

interface LivingBranchCanvasProps {
  visibleAlpha: number;
}

/**
 * Lightweight 0.38mm golden-ink calligraphy trail behind the pointer in Act I,
 * complementing the true 3D multi-species botanical garden rendered inside Three.js.
 */
export const LivingBranchCanvas: React.FC<LivingBranchCanvasProps> = ({
  visibleAlpha,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ribbonRef = useRef<InkRibbonPoint[]>([]);
  const requestDrawRef = useRef<(() => void) | null>(null);
  const visibleAlphaRef = useRef(visibleAlpha);

  useEffect(() => {
    visibleAlphaRef.current = visibleAlpha;
    requestDrawRef.current?.();
  }, [visibleAlpha]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = 1440;
    let height = 900;
    let rafId = 0;
    let isLooping = false;
    let lastTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const renderFrame = (now: number) => {
      rafId = 0;
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const alpha = visibleAlphaRef.current;
      if (alpha <= 0.01) {
        ribbonRef.current = [];
        ctx.clearRect(0, 0, width, height);
        isLooping = false;
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const ribbons = ribbonRef.current;
      for (let i = ribbons.length - 1; i >= 0; i--) {
        ribbons[i].age += dt;
        if (ribbons[i].age >= ribbons[i].maxAge) {
          ribbons.splice(i, 1);
        }
      }

      if (ribbons.length > 1) {
        ctx.lineCap = 'round';
        for (let i = 1; i < ribbons.length; i++) {
          const p0 = ribbons[i - 1];
          const p1 = ribbons[i];
          if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > 95) continue;
          const life = Math.max(0, 1 - p1.age / p1.maxAge);
          ctx.strokeStyle = `rgba(224, 179, 130, ${(life * 0.42 * alpha).toFixed(3)})`;
          ctx.lineWidth = p1.width * life;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }

      if (ribbons.length > 0) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        isLooping = false;
      }
    };

    const scheduleDraw = () => {
      if (isLooping || rafId !== 0) return;
      isLooping = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(renderFrame);
    };

    requestDrawRef.current = scheduleDraw;
    let lastPtr = { x: 0, y: 0, time: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion || visibleAlphaRef.current <= 0.08) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || x > width || y < 0 || y > height) return;

      const now = performance.now();
      const dt = Math.max(4, now - lastPtr.time);
      const dist = Math.hypot(x - lastPtr.x, y - lastPtr.y);
      const speed = dist / dt;
      lastPtr = { x, y, time: now };

      const widthPx = Math.max(0.9, Math.min(2.6, 2.3 - speed * 0.8));
      ribbonRef.current.push({ x, y, width: widthPx, age: 0, maxAge: 0.75 });
      if (ribbonRef.current.length > 44) ribbonRef.current.shift();
      scheduleDraw();
    };

    resize();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="living-branch-canvas"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full transition-opacity duration-150"
      style={{ opacity: visibleAlpha }}
      aria-hidden="true"
    />
  );
};
