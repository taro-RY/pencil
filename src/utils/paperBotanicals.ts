export type FlowerStyleId =
  | 'plum'
  | 'blueAster'
  | 'chrysanthemum'
  | 'lilyBell'
  | 'wisteria'
  | 'meadow';

export interface FlowerStyleSpec {
  id: FlowerStyleId;
  name: string;
  swatchHex: string;
  subtitle: string;
}

export const FLOWER_STYLE_LIST: FlowerStyleSpec[] = [
  {
    id: 'plum',
    name: '寒梅樱绯',
    swatchHex: '#D97B76',
    subtitle: '五出缺刻绯红梅樱 · 金蕊浮香',
  },
  {
    id: 'blueAster',
    name: '霁蓝勿忘我',
    swatchHex: '#5D9CE6',
    subtitle: '天青小花簇生 · 矢车菊与金心柔瓣',
  },
  {
    id: 'chrysanthemum',
    name: '秋霜细菊',
    swatchHex: '#DFAF4F',
    subtitle: '重瓣细丝辐射秋菊 · 疏朗齿叶',
  },
  {
    id: 'lilyBell',
    name: '幽谷铃兰',
    swatchHex: '#EAE5D4',
    subtitle: '弓形翠梗悬垂玉铃 · 宽脉柔叶',
  },
  {
    id: 'wisteria',
    name: '紫藤垂露',
    swatchHex: '#9C7FE0',
    subtitle: '柔蔓垂穗绛紫蝶花 · 缠枝生藤',
  },
  {
    id: 'meadow',
    name: '百草芳菲',
    swatchHex: '#6BAE75',
    subtitle: '蓝雏菊、细菊、梅樱与蕨叶随锋交织',
  },
];

export const FLOWER_STYLE_MAP: Record<FlowerStyleId, FlowerStyleSpec> = Object.fromEntries(
  FLOWER_STYLE_LIST.map((item) => [item.id, item]),
) as Record<FlowerStyleId, FlowerStyleSpec>;

function seededRoll(seed: number, salt = 1): number {
  const s = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  angle: number,
  len: number,
  tone: 'jade' | 'olive' | 'broad',
) {
  ctx.save();
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(0, 0, len, 0);
  if (tone === 'olive') {
    grad.addColorStop(0, 'rgba(72, 108, 66, 0.86)');
    grad.addColorStop(1, 'rgba(138, 174, 114, 0.8)');
  } else if (tone === 'broad') {
    grad.addColorStop(0, 'rgba(54, 104, 72, 0.85)');
    grad.addColorStop(1, 'rgba(116, 170, 128, 0.78)');
  } else {
    grad.addColorStop(0, 'rgba(58, 110, 78, 0.84)');
    grad.addColorStop(1, 'rgba(128, 182, 140, 0.78)');
  }

  const width = tone === 'broad' ? len * 0.42 : len * 0.3;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.48, -width, len, 0);
  ctx.quadraticCurveTo(len * 0.48, width, 0, 0);
  ctx.fill();

  // Delicate leaf midrib vein
  ctx.strokeStyle = 'rgba(245, 242, 232, 0.42)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(1.5, 0);
  ctx.lineTo(len * 0.82, 0);
  ctx.stroke();
  ctx.restore();
}

function drawChrysanthemumLeaf(ctx: CanvasRenderingContext2D, angle: number, len: number) {
  ctx.save();
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(0, 0, len, 0);
  grad.addColorStop(0, 'rgba(56, 98, 64, 0.86)');
  grad.addColorStop(1, 'rgba(118, 160, 108, 0.8)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.25, -len * 0.22, len * 0.42, -len * 0.14);
  ctx.quadraticCurveTo(len * 0.52, -len * 0.34, len * 0.72, -len * 0.18);
  ctx.lineTo(len, 0);
  ctx.lineTo(len * 0.72, len * 0.18);
  ctx.quadraticCurveTo(len * 0.52, len * 0.34, len * 0.42, len * 0.14);
  ctx.quadraticCurveTo(len * 0.25, len * 0.22, 0, 0);
  ctx.fill();
  ctx.restore();
}

function drawPlumBlossom(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  variant: number,
) {
  const isCrimson = variant > 0.68;
  const isIvory = variant < 0.22;
  const outerColor = isCrimson
    ? 'rgba(194, 72, 62, 0.88)'
    : isIvory
      ? 'rgba(242, 212, 206, 0.92)'
      : 'rgba(226, 136, 144, 0.88)';

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.15);
  grad.addColorStop(0, '#FFFDF9');
  grad.addColorStop(0.55, isCrimson ? 'rgba(232, 134, 126, 0.88)' : 'rgba(249, 224, 226, 0.9)');
  grad.addColorStop(1, outerColor);

  const petals = 5;
  ctx.fillStyle = grad;
  for (let p = 0; p < petals; p++) {
    ctx.save();
    ctx.rotate(angle + (p / petals) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(radius * 0.32, -radius * 0.48, radius * 0.92, -radius * 0.44, radius * 0.98, -radius * 0.1);
    ctx.quadraticCurveTo(radius * 0.86, 0, radius * 0.98, radius * 0.1);
    ctx.bezierCurveTo(radius * 0.92, radius * 0.44, radius * 0.32, radius * 0.48, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(188, 134, 62, 0.88)';
  ctx.lineWidth = 0.6;
  for (let s = 0; s < 6; s++) {
    const sa = angle + (s / 6) * Math.PI * 2;
    const sx = Math.cos(sa) * (radius * 0.42);
    const sy = Math.sin(sa) * (radius * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = '#D6943E';
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlueForgetMeNot(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  variant: number,
) {
  const isCornflower = variant > 0.62;
  const clusterCount = isCornflower ? 1 : 2 + Math.floor(variant * 2);

  for (let c = 0; c < clusterCount; c++) {
    const offA = angle + c * 2.15;
    const offDist = clusterCount === 1 ? 0 : 4.2 + c * 2.1;
    const cx = Math.cos(offA) * offDist;
    const cy = Math.sin(offA) * offDist;
    const r = clusterCount === 1 ? radius * 1.15 : radius * (0.64 + (c % 2) * 0.14);

    ctx.save();
    ctx.translate(cx, cy);

    if (isCornflower) {
      // 8-petal slender sky-blue aster / cornflower
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.1);
      grad.addColorStop(0, '#EBF5FF');
      grad.addColorStop(0.45, 'rgba(104, 166, 236, 0.9)');
      grad.addColorStop(1, 'rgba(62, 118, 198, 0.88)');
      ctx.fillStyle = grad;
      const petals = 8;
      for (let p = 0; p < petals; p++) {
        ctx.save();
        ctx.rotate(angle + (p / petals) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(r * 0.28, -r * 0.28, r * 0.85, -r * 0.25, r, 0);
        ctx.bezierCurveTo(r * 0.85, r * 0.25, r * 0.28, r * 0.28, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#F3CC58';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rounded 5-petal azure forget-me-not with white halo and gold eye
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, '#F5FAFF');
      grad.addColorStop(0.32, 'rgba(148, 202, 250, 0.92)');
      grad.addColorStop(1, c % 2 === 0 ? 'rgba(84, 152, 228, 0.9)' : 'rgba(116, 174, 240, 0.88)');
      ctx.fillStyle = grad;
      const petals = 5;
      for (let p = 0; p < petals; p++) {
        const pa = angle + (p / petals) * Math.PI * 2 + c * 0.4;
        const px = Math.cos(pa) * (r * 0.56);
        const py = Math.sin(pa) * (r * 0.56);
        ctx.beginPath();
        ctx.arc(px, py, r * 0.46, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EBB93E';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawChrysanthemum(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  variant: number,
) {
  const r = radius * 1.42;
  const isAmberGold = variant > 0.56;
  const isLilac = variant < 0.28;

  // Outer sweeping ring (20 slender curved ligulate petals)
  const outerCount = 20;
  for (let p = 0; p < outerCount; p++) {
    const pa = angle + (p / outerCount) * Math.PI * 2;
    const lenJitter = 0.88 + seededRoll(p, variant * 10) * 0.24;
    const pr = r * lenJitter;
    const curveSign = p % 2 === 0 ? 1 : -1;

    ctx.save();
    ctx.rotate(pa);
    const grad = ctx.createLinearGradient(0, 0, pr, 0);
    if (isAmberGold) {
      grad.addColorStop(0, 'rgba(186, 116, 32, 0.92)');
      grad.addColorStop(0.55, 'rgba(228, 174, 68, 0.92)');
      grad.addColorStop(1, 'rgba(248, 220, 138, 0.9)');
    } else if (isLilac) {
      grad.addColorStop(0, 'rgba(132, 98, 168, 0.9)');
      grad.addColorStop(0.6, 'rgba(182, 156, 214, 0.92)');
      grad.addColorStop(1, 'rgba(232, 218, 244, 0.9)');
    } else {
      grad.addColorStop(0, 'rgba(196, 172, 112, 0.92)');
      grad.addColorStop(0.55, 'rgba(238, 228, 192, 0.94)');
      grad.addColorStop(1, 'rgba(250, 245, 224, 0.92)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(pr * 0.55, -pr * 0.13 * curveSign, pr, pr * 0.05 * curveSign);
    ctx.quadraticCurveTo(pr * 0.55, pr * 0.14 * curveSign, 0, 0);
    ctx.fill();
    ctx.strokeStyle = isLilac ? 'rgba(110, 82, 146, 0.28)' : 'rgba(154, 116, 48, 0.28)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    ctx.restore();
  }

  // Inner shorter ring (14 petals)
  const innerCount = 14;
  for (let p = 0; p < innerCount; p++) {
    ctx.save();
    ctx.rotate(angle + ((p + 0.5) / innerCount) * Math.PI * 2);
    ctx.fillStyle = isAmberGold
      ? 'rgba(242, 196, 92, 0.94)'
      : isLilac
        ? 'rgba(212, 188, 234, 0.94)'
        : 'rgba(246, 236, 196, 0.95)';
    const ir = r * 0.66;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(ir * 0.5, -ir * 0.14, ir, 0);
    ctx.quadraticCurveTo(ir * 0.5, ir * 0.14, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  // Stippled golden heart
  ctx.fillStyle = '#C98A28';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F7DA78';
  ctx.beginPath();
  ctx.arc(-r * 0.05, -r * 0.04, r * 0.085, 0, Math.PI * 2);
  ctx.fill();
}

function drawLilyOfTheValley(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  side: number,
) {
  ctx.save();
  ctx.rotate(angle + side * 0.42);
  const stemLen = radius * 2.55;

  // Arched slender emerald stem
  ctx.strokeStyle = 'rgba(56, 114, 72, 0.9)';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(stemLen * 0.55, -stemLen * 0.58, stemLen, -stemLen * 0.14);
  ctx.stroke();

  // 4 hanging celadon-porcelain lily bells with crisp jade rims & calyx caps
  const bells = [0.32, 0.55, 0.77, 0.96];
  for (let i = 0; i < bells.length; i++) {
    const t = bells[i];
    const bx = stemLen * (t * (2 - t) * 0.55 + t * t * 0.45);
    const by = -stemLen * (2 * (1 - t) * t * 0.58 + t * t * 0.14);
    const bellSize = (4.8 + (3 - i) * 0.8) * (radius / 8.2);

    ctx.save();
    ctx.translate(bx, by);
    // Tiny green pedicel
    ctx.strokeStyle = 'rgba(64, 120, 78, 0.88)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1.2, 3.6);
    ctx.stroke();

    // Hanging scalloped porcelain-celadon bell (visible over cream Xuan paper)
    ctx.translate(1.2, 3.6);
    const grad = ctx.createLinearGradient(0, 0, 0, bellSize);
    grad.addColorStop(0, 'rgba(182, 212, 184, 0.96)');
    grad.addColorStop(0.45, 'rgba(242, 248, 240, 0.98)');
    grad.addColorStop(1, 'rgba(218, 232, 218, 0.96)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-bellSize * 0.58, bellSize * 0.25, -bellSize * 0.68, bellSize * 0.8, -bellSize * 0.5, bellSize);
    ctx.quadraticCurveTo(-bellSize * 0.2, bellSize * 0.82, 0, bellSize * 1.05);
    ctx.quadraticCurveTo(bellSize * 0.2, bellSize * 0.82, bellSize * 0.5, bellSize);
    ctx.bezierCurveTo(bellSize * 0.68, bellSize * 0.8, bellSize * 0.58, bellSize * 0.25, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(72, 114, 84, 0.72)';
    ctx.lineWidth = 0.65;
    ctx.stroke();

    // Emerald calyx dot at crown of bell
    ctx.fillStyle = 'rgba(66, 118, 78, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0.4, bellSize * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawWisteriaPanicle(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  variant: number,
) {
  ctx.save();
  ctx.rotate(angle * 0.22 + (variant - 0.5) * 0.32);
  const len = radius * 2.85;

  // Delicate vine spine
  ctx.strokeStyle = 'rgba(78, 116, 72, 0.82)';
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3, len * 0.5, 0, len);
  ctx.stroke();

  const florets = 9;
  for (let i = 0; i < florets; i++) {
    const t = i / (florets - 1);
    const fy = 2.2 + t * (len - 2);
    const fx = Math.sin(i * 2.1) * (4.8 * (1 - t * 0.52));
    const size = (4.6 - t * 2.1) * (radius / 8.0);
    const violetTone =
      i < 3
        ? 'rgba(112, 78, 184, 0.9)'
        : i < 6
          ? 'rgba(150, 118, 214, 0.9)'
          : 'rgba(190, 168, 236, 0.9)';

    ctx.fillStyle = violetTone;
    ctx.beginPath();
    ctx.ellipse(fx, fy, size * 0.95, size * 0.68, i % 2 === 0 ? -0.32 : 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(250, 245, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(fx, fy - size * 0.18, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBotanicalSprout(
  ctx: CanvasRenderingContext2D,
  style: FlowerStyleId,
  x: number,
  y: number,
  angle: number,
  seedVal: number,
) {
  const roll = seededRoll(seedVal, 2);
  const variant = seededRoll(seedVal, 5);
  const side = variant > 0.5 ? -1 : 1;
  const radius = 6.8 + seededRoll(seedVal, 11) * 4.6;

  ctx.save();
  ctx.translate(x, y);

  let effectiveStyle: FlowerStyleId = style;
  if (style === 'meadow') {
    const pool: FlowerStyleId[] = ['blueAster', 'chrysanthemum', 'plum', 'lilyBell', 'wisteria'];
    effectiveStyle = pool[Math.floor(seededRoll(seedVal, 9) * pool.length)];
  }

  if (roll > 0.32) {
    if (effectiveStyle === 'plum') {
      drawPlumBlossom(ctx, angle, radius, variant);
    } else if (effectiveStyle === 'blueAster') {
      drawBlueForgetMeNot(ctx, angle, radius, variant);
    } else if (effectiveStyle === 'chrysanthemum') {
      drawChrysanthemum(ctx, angle, radius, variant);
    } else if (effectiveStyle === 'lilyBell') {
      drawLilyOfTheValley(ctx, angle, radius, side);
    } else if (effectiveStyle === 'wisteria') {
      drawWisteriaPanicle(ctx, angle, radius, variant);
    }
  } else if (roll > 0.16) {
    if (effectiveStyle === 'chrysanthemum') {
      drawChrysanthemumLeaf(ctx, angle + side * 0.75, 11 + (seedVal % 6));
    } else if (effectiveStyle === 'lilyBell') {
      drawLeaf(ctx, angle + side * 0.62, 13 + (seedVal % 6), 'broad');
    } else {
      drawLeaf(
        ctx,
        angle + side * 0.72,
        9.5 + (seedVal % 5.5),
        effectiveStyle === 'blueAster' ? 'olive' : 'jade',
      );
    }
  } else {
    // Graceful fine ink-green grass filament
    const h = 10 + (seedVal % 8);
    ctx.strokeStyle = 'rgba(72, 120, 84, 0.78)';
    ctx.lineWidth = 1.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 5, -h * 0.6, side * 10.5, -h);
    ctx.stroke();
  }

  ctx.restore();
}
