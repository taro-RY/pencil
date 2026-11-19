import { FlowerStyleId, drawBotanicalSprout } from './paperBotanicals';

export type StudioToolMode = 'poetic' | 'pure' | 'eraser';

export type InkColorId = 'sumi' | 'indigo' | 'umber' | 'vermilion' | 'gold';

export type PaperPresetId = 'xuan-white' | 'warm-vellum' | 'night-gold';

export type NibSizeId = 'fine' | 'standard' | 'bold';

export type BloomDensityId = 'sparse' | 'lush';

export interface InkColorSpec {
  id: InkColorId;
  name: string;
  hex: string;
}

export interface PaperPresetSpec {
  id: PaperPresetId;
  name: string;
  bgHex: string;
  dotRgba: string;
  ruleRgba: string;
  sealColor: string;
  isDark: boolean;
}

export interface NibSizeSpec {
  id: NibSizeId;
  label: string;
  scale: number;
}

export const INK_COLORS: InkColorSpec[] = [
  { id: 'sumi', name: '松烟浓墨', hex: '#141413' },
  { id: 'indigo', name: '靛青宿墨', hex: '#1E3A5A' },
  { id: 'umber', name: '赭石古铜', hex: '#643E28' },
  { id: 'vermilion', name: '朱砂印泥', hex: '#9E3426' },
  { id: 'gold', name: '泥金雅墨', hex: '#D8A96E' },
];

export const PAPER_PRESETS: PaperPresetSpec[] = [
  {
    id: 'xuan-white',
    name: '素白棉浆',
    bgHex: '#F5F2EA',
    dotRgba: 'rgba(20, 20, 19, 0.10)',
    ruleRgba: 'rgba(180, 128, 76, 0.14)',
    sealColor: '#B84A39',
    isDark: false,
  },
  {
    id: 'warm-vellum',
    name: '暖宣熟纸',
    bgHex: '#EFE6D2',
    dotRgba: 'rgba(66, 48, 28, 0.10)',
    ruleRgba: 'rgba(148, 100, 48, 0.16)',
    sealColor: '#A43A2A',
    isDark: false,
  },
  {
    id: 'night-gold',
    name: '暗夜洒金',
    bgHex: '#151922',
    dotRgba: 'rgba(224, 179, 130, 0.14)',
    ruleRgba: 'rgba(200, 155, 110, 0.16)',
    sealColor: '#D97B66',
    isDark: true,
  },
];

export const NIB_SIZES: NibSizeSpec[] = [
  { id: 'fine', label: '0.28mm 细锋', scale: 0.78 },
  { id: 'standard', label: '0.38mm 标准', scale: 1.0 },
  { id: 'bold', label: '0.55mm 饱满', scale: 1.42 },
];

export interface StudioStrokePoint {
  nx: number;
  ny: number;
  widthPx: number;
}

export interface StudioSproutStamp {
  nx: number;
  ny: number;
  angle: number;
  seed: number;
  afterPointIndex?: number;
}

export interface StudioStroke {
  id: number;
  tool: StudioToolMode;
  flowerStyle: FlowerStyleId;
  inkHex: string;
  nibScale: number;
  points: StudioStrokePoint[];
  sprouts: StudioSproutStamp[];
}

export interface StudioHistoryState {
  past: StudioStroke[][];
  present: StudioStroke[];
  future: StudioStroke[][];
}

export function createStudioHistory(): StudioHistoryState {
  return {
    past: [],
    present: [],
    future: [],
  };
}

export function commitStudioStroke(
  history: StudioHistoryState,
  stroke: StudioStroke,
  maxSteps = 60,
): StudioHistoryState {
  if (stroke.points.length === 0) return history;
  const nextPast = [...history.past, history.present];
  if (nextPast.length > maxSteps) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    present: [...history.present, stroke],
    future: [],
  };
}

export function clearStudioWithUndo(history: StudioHistoryState): StudioHistoryState {
  if (history.present.length === 0) return history;
  return {
    past: [...history.past, history.present],
    present: [],
    future: [],
  };
}

export function undoStudioHistory(history: StudioHistoryState): StudioHistoryState {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoStudioHistory(history: StudioHistoryState): StudioHistoryState {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function getPaperPreset(id: PaperPresetId): PaperPresetSpec {
  return PAPER_PRESETS.find((p) => p.id === id) ?? PAPER_PRESETS[0];
}

export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: PaperPresetSpec,
  includeSeal = false,
) {
  ctx.save();
  ctx.fillStyle = preset.bgHex;
  ctx.fillRect(0, 0, w, h);

  // Fine dot matrix & gold flecks for night-gold paper
  ctx.fillStyle = preset.dotRgba;
  const step = 32;
  for (let x = step; x < w - 18; x += step) {
    for (let y = step; y < h - 18; y += step) {
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  }

  if (preset.id === 'night-gold') {
    for (let i = 0; i < 42; i++) {
      const fx = ((Math.sin(i * 71.3) + 1) * 0.5) * w;
      const fy = ((Math.cos(i * 43.7) + 1) * 0.5) * h;
      const sz = 0.9 + (i % 3) * 0.7;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(224, 179, 130, 0.25)' : 'rgba(200, 155, 110, 0.16)';
      ctx.fillRect(fx, fy, sz, sz);
    }
  }

  // Subtle horizontal poetic writing baseline
  ctx.strokeStyle = preset.ruleRgba;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(32, h * 0.52);
  ctx.lineTo(w - 32, h * 0.52);
  ctx.stroke();

  if (includeSeal) {
    ctx.strokeStyle = preset.sealColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(w - 64, h - 42, 40, 22);
    ctx.fillStyle = preset.sealColor;
    ctx.font = '500 11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M01·春', w - 44, h - 30.5);
  }
  ctx.restore();
}

export function renderSingleStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StudioStroke,
  w: number,
  h: number,
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.inkHex;
    ctx.fillStyle = stroke.inkHex;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = stroke.points;

  // Always draw initial pen touch-down dot so single taps and strokes match pointerdown identically
  const firstPt = pts[0];
  const dotR = stroke.tool === 'eraser' ? 12 * stroke.nibScale : 1.15 * stroke.nibScale;
  ctx.beginPath();
  ctx.arc(firstPt.nx * w, firstPt.ny * h, Math.max(0.8, dotR), 0, Math.PI * 2);
  ctx.fill();

  const indexedSprouts = new Map<number, StudioSproutStamp[]>();
  const trailingSprouts: StudioSproutStamp[] = [];
  if (stroke.tool === 'poetic') {
    for (const sp of stroke.sprouts) {
      if (typeof sp.afterPointIndex === 'number') {
        const list = indexedSprouts.get(sp.afterPointIndex);
        if (list) list.push(sp);
        else indexedSprouts.set(sp.afterPointIndex, [sp]);
      } else {
        trailingSprouts.push(sp);
      }
    }
  }

  if (pts.length > 1) {
    let midX = pts[0].nx * w;
    let midY = pts[0].ny * h;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const px = prev.nx * w;
      const py = prev.ny * h;
      const cx = cur.nx * w;
      const cy = cur.ny * h;
      const nextMidX = (px + cx) * 0.5;
      const nextMidY = (py + cy) * 0.5;

      ctx.lineWidth =
        stroke.tool === 'eraser'
          ? 24 * stroke.nibScale
          : Math.max(0.75, cur.widthPx * stroke.nibScale);
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.quadraticCurveTo(px, py, nextMidX, nextMidY);
      ctx.stroke();

      const stepSprouts = indexedSprouts.get(i);
      if (stepSprouts) {
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        for (const sp of stepSprouts) {
          drawBotanicalSprout(ctx, stroke.flowerStyle, sp.nx * w, sp.ny * h, sp.angle, sp.seed);
        }
        ctx.restore();
      }

      midX = nextMidX;
      midY = nextMidY;
    }
  }

  ctx.restore();

  if (stroke.tool === 'poetic' && trailingSprouts.length > 0) {
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    for (const sp of trailingSprouts) {
      drawBotanicalSprout(ctx, stroke.flowerStyle, sp.nx * w, sp.ny * h, sp.angle, sp.seed);
    }
    ctx.restore();
  }
}

export function renderStudioArtwork(
  inkCtx: CanvasRenderingContext2D,
  strokes: StudioStroke[],
  w: number,
  h: number,
) {
  inkCtx.clearRect(0, 0, w, h);
  for (const stroke of strokes) {
    renderSingleStroke(inkCtx, stroke, w, h);
  }
}
