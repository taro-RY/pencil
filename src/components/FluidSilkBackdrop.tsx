import React, { useEffect, useRef } from 'react';
import { detectSoftwareWebGL } from '../three/studioSetup';

interface AtmosphericStop {
  at: number;
  baseTop: [number, number, number];
  baseBottom: [number, number, number];
  ribbonA: [number, number, number];
  ribbonB: [number, number, number];
  accentGlow: [number, number, number];
}

const ATMOSPHERE_STOPS: AtmosphericStop[] = [
  // Act I: Twilight Indigo & Warm Gold Silk (not flat black)
  {
    at: 0.0,
    baseTop: [19, 24, 36],
    baseBottom: [14, 17, 25],
    ribbonA: [58, 78, 108],
    ribbonB: [176, 132, 88],
    accentGlow: [112, 152, 134],
  },
  // Act II: Abyssal Deep Mineral Sea
  {
    at: 0.34,
    baseTop: [11, 25, 38],
    baseBottom: [13, 21, 31],
    ribbonA: [36, 98, 126],
    ribbonB: [194, 148, 102],
    accentGlow: [64, 142, 158],
  },
  // Act III: Warm Charcoal & Bronze Studio Silk
  {
    at: 0.68,
    baseTop: [24, 21, 22],
    baseBottom: [17, 16, 19],
    ribbonA: [128, 92, 64],
    ribbonB: [74, 86, 102],
    accentGlow: [200, 155, 110],
  },
  // Act IV: Atelier Slate & Kiln Vermilion Mist
  {
    at: 1.0,
    baseTop: [22, 19, 23],
    baseBottom: [15, 14, 18],
    ribbonA: [148, 78, 62],
    ribbonB: [186, 138, 92],
    accentGlow: [196, 132, 92],
  },
];

function lerpTuple(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function samplePalette(scrollNorm: number) {
  const s = Math.max(0, Math.min(1, scrollNorm));
  for (let i = 0; i < ATMOSPHERE_STOPS.length - 1; i++) {
    const a = ATMOSPHERE_STOPS[i];
    const b = ATMOSPHERE_STOPS[i + 1];
    if (s >= a.at && s <= b.at) {
      const t = (s - a.at) / Math.max(0.001, b.at - a.at);
      return {
        baseTop: lerpTuple(a.baseTop, b.baseTop, t),
        baseBottom: lerpTuple(a.baseBottom, b.baseBottom, t),
        ribbonA: lerpTuple(a.ribbonA, b.ribbonA, t),
        ribbonB: lerpTuple(a.ribbonB, b.ribbonB, t),
        accentGlow: lerpTuple(a.accentGlow, b.accentGlow, t),
      };
    }
  }
  const last = ATMOSPHERE_STOPS[ATMOSPHERE_STOPS.length - 1];
  return last;
}

interface FloatingMote {
  x: number;
  y: number;
  r: number;
  speedX: number;
  speedY: number;
  phase: number;
  warm: boolean;
}

export const FluidSilkBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isSoftware = detectSoftwareWebGL();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafId = 0;
    let scrollNorm = 0;
    let pointerNormX = 0.5;
    let pointerNormY = 0.5;

    // Deterministic atmospheric pollen/silk motes
    const motes: FloatingMote[] = Array.from({ length: 44 }, (_, idx) => {
      const s1 = Math.sin(idx * 12.9898) * 43758.5453;
      const s2 = Math.sin(idx * 78.233) * 19341.123;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);
      return {
        x: r1,
        y: r2,
        r: 1.0 + (idx % 4) * 0.55,
        speedX: 0.006 + (idx % 5) * 0.0025,
        speedY: -0.004 - (idx % 3) * 0.002,
        phase: idx * 0.7,
        warm: idx % 3 !== 0,
      };
    });

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      // Half-res canvas keeps fluid silk gradients ultra-smooth and light
      const scale = isSoftware ? 0.5 : 0.75;
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const drawSilkWave = (
      yBase: number,
      amp: number,
      freq: number,
      phase: number,
      rgb: [number, number, number],
      alpha: number,
    ) => {
      const grad = ctx.createLinearGradient(0, yBase - amp * 2.2, width, yBase + amp * 2.2);
      grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
      grad.addColorStop(0.35, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`);
      grad.addColorStop(0.68, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.8})`);
      grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const px = (i / steps) * width;
        const py =
          yBase +
          Math.sin(i * freq + phase) * amp +
          Math.cos(i * freq * 0.55 - phase * 0.7) * (amp * 0.55);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    const render = (nowMs: number) => {
      const t = nowMs * 0.00038;
      const pal = samplePalette(scrollNorm);

      // 1. Deep atmospheric vertical wash (Twilight Indigo / Abyssal / Warm Charcoal)
      const bgGrad = ctx.createLinearGradient(0, 0, width * 0.35, height);
      bgGrad.addColorStop(0, `rgb(${pal.baseTop[0]}, ${pal.baseTop[1]}, ${pal.baseTop[2]})`);
      bgGrad.addColorStop(
        1,
        `rgb(${pal.baseBottom[0]}, ${pal.baseBottom[1]}, ${pal.baseBottom[2]})`,
      );
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Pointer-responsive soft radial aurora halo
      const haloX = width * (0.35 + pointerNormX * 0.3);
      const haloY = height * (0.35 + pointerNormY * 0.25);
      const halo = ctx.createRadialGradient(
        haloX,
        haloY,
        10,
        haloX,
        haloY,
        Math.max(width, height) * 0.52,
      );
      halo.addColorStop(
        0,
        `rgba(${pal.accentGlow[0]}, ${pal.accentGlow[1]}, ${pal.accentGlow[2]}, 0.14)`,
      );
      halo.addColorStop(
        0.5,
        `rgba(${pal.ribbonB[0]}, ${pal.ribbonB[1]}, ${pal.ribbonB[2]}, 0.06)`,
      );
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      // 3. Flowing layered mineral-silk aurora currents
      drawSilkWave(height * 0.42, height * 0.11, 0.36, t * 1.1, pal.ribbonA, 0.14);
      drawSilkWave(height * 0.58, height * 0.09, 0.28, -t * 0.9 + 1.4, pal.ribbonB, 0.11);
      drawSilkWave(height * 0.76, height * 0.08, 0.42, t * 0.7 + 2.8, pal.accentGlow, 0.08);

      // 4. Drifting luminous silk motes
      for (const m of motes) {
        const mx = ((m.x + t * m.speedX * 14) % 1) * width;
        const my = ((m.y + t * m.speedY * 14 + 10) % 1) * height;
        const twinkle = 0.22 + 0.28 * Math.sin(t * 4.5 + m.phase);
        const col = m.warm ? pal.ribbonB : pal.accentGlow;
        ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${twinkle.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isSoftware && !prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    const updateScroll = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      scrollNorm = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      if (isSoftware || prefersReducedMotion) {
        render(performance.now());
      }
    };

    const updatePointer = (e: PointerEvent) => {
      pointerNormX = Math.max(0, Math.min(1, e.clientX / Math.max(1, width)));
      pointerNormY = Math.max(0, Math.min(1, e.clientY / Math.max(1, height)));
      if (isSoftware || prefersReducedMotion) {
        render(performance.now());
      }
    };

    resize();
    updateScroll();
    render(performance.now());

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('pointermove', updatePointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="fluid-silk-backdrop"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
};
