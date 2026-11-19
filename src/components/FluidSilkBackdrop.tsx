import React, { useEffect, useRef, useState } from 'react';
import { detectSoftwareWebGL } from '../three/studioSetup';
import { WallpaperId, getWallpaperPreset } from '../utils/wallpapers';

interface FluidSilkBackdropProps {
  wallpaperId: WallpaperId;
  customWallpaperUrl?: string | null;
}

interface CloudCluster {
  baseX: number;
  yFrac: number;
  scale: number;
  speed: number;
  opacity: number;
  blobs: Array<{ dx: number; dy: number; r: number }>;
}

const CLOUD_CLUSTERS: CloudCluster[] = [
  {
    baseX: 0.14,
    yFrac: 0.56,
    scale: 1.25,
    speed: 0.0085,
    opacity: 0.94,
    blobs: [
      { dx: -96, dy: 24, r: 58 },
      { dx: -42, dy: -8, r: 78 },
      { dx: 24, dy: -22, r: 92 },
      { dx: 88, dy: 4, r: 68 },
      { dx: 138, dy: 28, r: 48 },
    ],
  },
  {
    baseX: 0.52,
    yFrac: 0.48,
    scale: 1.05,
    speed: 0.0058,
    opacity: 0.88,
    blobs: [
      { dx: -82, dy: 20, r: 50 },
      { dx: -24, dy: -16, r: 74 },
      { dx: 38, dy: -4, r: 64 },
      { dx: 92, dy: 22, r: 44 },
    ],
  },
  {
    baseX: 0.84,
    yFrac: 0.6,
    scale: 1.18,
    speed: 0.0072,
    opacity: 0.9,
    blobs: [
      { dx: -95, dy: 18, r: 54 },
      { dx: -32, dy: -14, r: 80 },
      { dx: 35, dy: -10, r: 72 },
      { dx: 95, dy: 16, r: 52 },
    ],
  },
  {
    baseX: 0.34,
    yFrac: 0.25,
    scale: 0.68,
    speed: 0.0044,
    opacity: 0.55,
    blobs: [
      { dx: -52, dy: 10, r: 34 },
      { dx: 0, dy: -8, r: 46 },
      { dx: 52, dy: 8, r: 32 },
    ],
  },
  {
    baseX: 0.72,
    yFrac: 0.21,
    scale: 0.62,
    speed: 0.0038,
    opacity: 0.5,
    blobs: [
      { dx: -46, dy: 10, r: 30 },
      { dx: 6, dy: -6, r: 42 },
      { dx: 54, dy: 8, r: 28 },
    ],
  },
];

interface AirMote {
  x: number;
  y: number;
  r: number;
  speedX: number;
  speedY: number;
  phase: number;
}

const AIR_MOTES: AirMote[] = Array.from({ length: 34 }, (_, idx) => {
  const s1 = Math.sin(idx * 12.9898) * 43758.5453;
  const s2 = Math.sin(idx * 78.233) * 19341.123;
  return {
    x: s1 - Math.floor(s1),
    y: s2 - Math.floor(s2),
    r: 1.2 + (idx % 4) * 0.65,
    speedX: 0.007 + (idx % 5) * 0.0025,
    speedY: -0.003 - (idx % 3) * 0.0018,
    phase: idx * 0.8,
  };
});

export const FluidSilkBackdrop: React.FC<FluidSilkBackdropProps> = ({
  wallpaperId,
  customWallpaperUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const preset = getWallpaperPreset(wallpaperId);
  const activeImageUrl =
    wallpaperId === 'custom-local'
      ? customWallpaperUrl || undefined
      : preset.kind === 'static'
        ? preset.imageUrl
        : undefined;

  useEffect(() => {
    setImageFailed(false);
  }, [activeImageUrl]);

  useEffect(() => {
    if (activeImageUrl && !imageFailed) {
      return;
    }

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
    let pointerNormX = 0.5;
    let pointerNormY = 0.5;

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const scale = isSoftware ? 0.55 : 0.8;
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const drawCumulusCloud = (
      cx: number,
      cy: number,
      scale: number,
      opacity: number,
      blobs: CloudCluster['blobs'],
      litColor: string,
      shadowColor: string,
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Soft ambient cloud halo blur
      ctx.globalAlpha = opacity * 0.34;
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.dx, b.dy + 4, b.r * 0.1, b.dx, b.dy + 4, b.r * 1.38);
        g.addColorStop(0, litColor);
        g.addColorStop(0.6, shadowColor);
        g.addColorStop(1, 'rgba(255, 245, 232, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.dx, b.dy + 4, b.r * 1.38, 0, Math.PI * 2);
        ctx.fill();
      }

      // Warm peach/apricot shaded cloud volume with radial falloff
      for (const b of blobs) {
        const g = ctx.createRadialGradient(
          b.dx - b.r * 0.28,
          b.dy - b.r * 0.28,
          b.r * 0.12,
          b.dx,
          b.dy + 10,
          b.r * 1.08,
        );
        g.addColorStop(0, '#FFFFFF');
        g.addColorStop(0.55, litColor);
        g.addColorStop(1, shadowColor);
        ctx.globalAlpha = opacity * 0.92;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.dx, b.dy + 2, b.r * 1.04, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sunlit upper-left rim crests
      ctx.globalAlpha = opacity * 0.72;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (const b of blobs) {
        ctx.moveTo(b.dx - 8 + b.r * 0.66, b.dy - 10);
        ctx.arc(b.dx - 8, b.dy - 10, b.r * 0.66, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
    };

    const render = (nowMs: number) => {
      const t = nowMs * 0.001;
      const pxOffset = (pointerNormX - 0.5) * 32;
      const pyOffset = (pointerNormY - 0.5) * 16;

      if (wallpaperId === 'xuan-morning') {
        // Luminous sunlit museum xuan-paper sky
        const sky = ctx.createLinearGradient(0, 0, width * 0.25, height);
        sky.addColorStop(0, '#EFE9DC');
        sky.addColorStop(0.55, '#F6F3EB');
        sky.addColorStop(1, '#E6DDD0');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        const sunGlow = ctx.createRadialGradient(
          width * (0.28 + pointerNormX * 0.14),
          height * 0.18,
          12,
          width * 0.35,
          height * 0.22,
          Math.max(width, height) * 0.65,
        );
        sunGlow.addColorStop(0, 'rgba(255, 249, 232, 0.92)');
        sunGlow.addColorStop(0.55, 'rgba(244, 218, 178, 0.24)');
        sunGlow.addColorStop(1, 'rgba(244, 218, 178, 0)');
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, width, height);

        for (const c of CLOUD_CLUSTERS) {
          const span = width + 420;
          const x = ((c.baseX * span + t * c.speed * width * 0.7 + pxOffset * 0.45) % span) - 210;
          const y = c.yFrac * height * 0.85 + Math.sin(t * 0.35 + c.baseX * 6) * 4 + pyOffset * 0.35;
          drawCumulusCloud(
            x,
            y,
            c.scale * (width / 1440),
            c.opacity * 0.65,
            c.blobs,
            '#FFFDF9',
            '#E5D8C5',
          );
        }
      } else if (wallpaperId === 'sakura-breeze') {
        // Bright spring cerulean & blush petal sky
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, '#78C0E6');
        sky.addColorStop(0.52, '#C7E7F7');
        sky.addColorStop(0.84, '#F5EDF0');
        sky.addColorStop(1, '#FAEEEB');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        for (const c of CLOUD_CLUSTERS) {
          const span = width + 460;
          const x = ((c.baseX * span + t * c.speed * width + pxOffset * 0.55) % span) - 230;
          const y = c.yFrac * height * 0.92 + Math.sin(t * 0.42 + c.baseX * 5) * 5 + pyOffset * 0.4;
          drawCumulusCloud(
            x,
            y,
            c.scale * (width / 1440),
            c.opacity * 0.92,
            c.blobs,
            '#FFF9FB',
            '#F2CED8',
          );
        }

        // Drifting luminous sakura petals in air breeze
        for (const m of AIR_MOTES) {
          const mx = ((m.x + t * m.speedX * 4.5) % 1) * width;
          const my = ((m.y - t * m.speedY * 5 + 10) % 1) * height;
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(t * 0.8 + m.phase);
          ctx.fillStyle = `rgba(244, 166, 186, ${(0.35 + 0.25 * Math.sin(t * 2 + m.phase)).toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, m.r * 2.4, m.r * 1.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        // Default: 'coastal-daylight' — inspired by user's bright turquoise-cloud seaside wallpaper
        const sky = ctx.createLinearGradient(0, 0, 0, height * 0.80);
        sky.addColorStop(0, '#50B7BD');
        sky.addColorStop(0.45, '#86D6D3');
        sky.addColorStop(0.84, '#CCEFE9');
        sky.addColorStop(1, '#F6E8D0');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // Diagonal sunlit contrails cutting softly across upper turquoise sky
        ctx.save();
        const c1 = ctx.createLinearGradient(0, height * 0.14, width * 0.58, height * 0.36);
        c1.addColorStop(0, 'rgba(255, 252, 240, 0.72)');
        c1.addColorStop(1, 'rgba(255, 252, 240, 0)');
        ctx.strokeStyle = c1;
        ctx.lineWidth = Math.max(8, height * 0.015);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-40, height * 0.12 + pyOffset * 0.2);
        ctx.quadraticCurveTo(width * 0.25, height * 0.26, width * 0.58, height * 0.35);
        ctx.stroke();

        const c2 = ctx.createLinearGradient(width * 0.58, height * 0.24, width, height * 0.44);
        c2.addColorStop(0, 'rgba(255, 252, 240, 0)');
        c2.addColorStop(1, 'rgba(255, 252, 240, 0.52)');
        ctx.strokeStyle = c2;
        ctx.lineWidth = Math.max(4, height * 0.008);
        ctx.beginPath();
        ctx.moveTo(width * 0.58, height * 0.23 + pyOffset * 0.15);
        ctx.lineTo(width + 40, height * 0.44);
        ctx.stroke();
        ctx.restore();

        // Drifting warm cream cumulus clouds along the horizon
        for (const c of CLOUD_CLUSTERS) {
          const span = width + 480;
          const x = ((c.baseX * span + t * c.speed * width + pxOffset * 0.6) % span) - 240;
          const y = c.yFrac * height + Math.sin(t * 0.38 + c.baseX * 6) * 4 + pyOffset * 0.35;
          drawCumulusCloud(
            x,
            y,
            c.scale * Math.max(0.7, width / 1440),
            c.opacity,
            c.blobs,
            '#FFF5E4',
            '#E6C5AE',
          );
        }

        // Seamless warm sunlit horizon mist blending cloud base into sea
        const seaTop = height * 0.77;
        const seaBottom = height * 0.86;
        const horizonGlow = ctx.createLinearGradient(0, seaTop - height * 0.08, 0, seaTop + 14);
        horizonGlow.addColorStop(0, 'rgba(246, 232, 208, 0)');
        horizonGlow.addColorStop(1, 'rgba(248, 241, 226, 0.65)');
        ctx.fillStyle = horizonGlow;
        ctx.fillRect(0, seaTop - height * 0.08, width, height * 0.08 + 14);

        // Calm sunlit teal-blue ocean horizon band
        const sea = ctx.createLinearGradient(0, seaTop, 0, seaBottom);
        sea.addColorStop(0, '#58A2AD');
        sea.addColorStop(0.55, '#72BBC2');
        sea.addColorStop(1, '#C4E4E2');
        ctx.fillStyle = sea;
        ctx.fillRect(0, seaTop, width, seaBottom - seaTop);

        // Gentle animated ocean foam & sunlight glints
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 252, 244, 0.52)';
        ctx.lineWidth = 1.6;
        for (let row = 0; row < 4; row++) {
          const ry = seaTop + 8 + row * ((seaBottom - seaTop) * 0.22);
          ctx.beginPath();
          for (let i = 0; i <= 24; i++) {
            const x = (i / 24) * width;
            const wave = Math.sin(i * 0.65 + t * (1.1 + row * 0.2) + row) * 2.2;
            if (i === 0) ctx.moveTo(x, ry + wave);
            else ctx.lineTo(x, ry + wave);
          }
          ctx.stroke();
        }
        ctx.restore();

        // Warm sunlit coastal sand base
        const sand = ctx.createLinearGradient(0, seaBottom, 0, height);
        sand.addColorStop(0, '#EAD8C3');
        sand.addColorStop(0.35, '#DFBF9E');
        sand.addColorStop(1, '#D6B08E');
        ctx.fillStyle = sand;
        ctx.fillRect(0, seaBottom, width, height - seaBottom);
      }

      // Soft air-light motes shared subtly across bright dynamic skies
      if (wallpaperId !== 'sakura-breeze') {
        for (const m of AIR_MOTES) {
          const mx = ((m.x + t * m.speedX * 3.5) % 1) * width;
          const my = ((m.y + t * m.speedY * 3.5 + 10) % 1) * height;
          const alpha = 0.22 + 0.18 * Math.sin(t * 1.8 + m.phase);
          ctx.fillStyle = `rgba(255, 253, 245, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(mx, my, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!isSoftware && !prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
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
    render(performance.now());

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', updatePointer, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', updatePointer);
    };
  }, [wallpaperId, activeImageUrl, imageFailed]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: preset.fallbackBgHex }}
      data-testid="fluid-silk-backdrop"
      data-wallpaper-id={wallpaperId}
      data-wallpaper-kind={preset.kind}
      aria-hidden="true"
    >
      {activeImageUrl && !imageFailed ? (
        <>
          <img
            src={activeImageUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            data-testid="static-wallpaper-img"
            className="h-full w-full object-cover object-center transition-opacity duration-500"
          />
          {/* Measured luminous mist veil preserves >=4.5:1 contrast for foreground ink copy */}
          <div className="absolute inset-0 bg-[#FAF8F4]/30" />
        </>
      ) : (
        <canvas
          ref={canvasRef}
          className="h-full w-full block"
        />
      )}
    </div>
  );
};
