export type MaterialId = 'raw-titanium' | 'obsidian-matte' | 'brushed-brass';

export interface PenMaterialSpec {
  id: MaterialId;
  name: string;
  englishName: string;
  subtitle: string;
  priceCny: number;
  finishNote: string;
  swatchHex: string;
  swatchHighlightHex: string;
  pbr: {
    colorHex: number;
    accentHex: number;
    metalness: number;
    roughness: number;
    anisotropy: number;
    clearcoat: number;
    clearcoatRoughness: number;
    surfaceTexture: 'bead-blasted' | 'dlc-matte' | 'brushed';
  };
}

export const PEN_MATERIALS: Record<MaterialId, PenMaterialSpec> = {
  'raw-titanium': {
    id: 'raw-titanium',
    name: '原色微珠喷砂钛灰',
    englishName: 'Raw Titanium',
    subtitle: 'Ti-6Al-4V 原色陶瓷微珠喷砂',
    priceCny: 1280,
    finishNote: '280 目氧化锆微珠低气压均质喷砂，保留五级钛冷峻微哑质感，抗日常指纹与细微划痕。',
    swatchHex: '#8E9297',
    swatchHighlightHex: '#D5D8DC',
    pbr: {
      colorHex: 0x8f9398,
      accentHex: 0xc2c6cc,
      metalness: 0.92,
      roughness: 0.34,
      anisotropy: 0.25,
      clearcoat: 0.08,
      clearcoatRoughness: 0.4,
      surfaceTexture: 'bead-blasted',
    },
  },
  'obsidian-matte': {
    id: 'obsidian-matte',
    name: 'DLC 类金刚石哑光黑',
    englishName: 'Obsidian Matte',
    subtitle: 'PVD + 类金刚石碳基镀层',
    priceCny: 1480,
    finishNote: '真空等离子沉积 3μm 类金刚石碳膜，表面维氏硬度达 2800HV，呈现深邃无眩光的碳墨黑。',
    swatchHex: '#1C1E22',
    swatchHighlightHex: '#4B5059',
    pbr: {
      colorHex: 0x1d1f24,
      accentHex: 0x3b3f47,
      metalness: 0.78,
      roughness: 0.42,
      anisotropy: 0.15,
      clearcoat: 0.05,
      clearcoatRoughness: 0.55,
      surfaceTexture: 'dlc-matte',
    },
  },
  'brushed-brass': {
    id: 'brushed-brass',
    name: '手工拉丝黄铜限定',
    englishName: 'Brushed Brass',
    subtitle: 'C36000 实心黄铜轴向拉丝',
    priceCny: 1680,
    finishNote: '无封釉裸铜工艺，手工 600 目轴向拉丝纹理，随掌心温度与时间推移自然氧化形成独一无二的包浆。',
    swatchHex: '#C29B59',
    swatchHighlightHex: '#F0D59B',
    pbr: {
      colorHex: 0xc59b57,
      accentHex: 0xdfb978,
      metalness: 0.96,
      roughness: 0.22,
      anisotropy: 0.85,
      clearcoat: 0.12,
      clearcoatRoughness: 0.28,
      surfaceTexture: 'brushed',
    },
  },
};

export const MATERIAL_LIST: PenMaterialSpec[] = [
  PEN_MATERIALS['raw-titanium'],
  PEN_MATERIALS['obsidian-matte'],
  PEN_MATERIALS['brushed-brass'],
];

export type PartId =
  | 'cap'
  | 'ratchet'
  | 'clip'
  | 'sleeve'
  | 'barrel'
  | 'refill'
  | 'tip';

export interface ExplodedPartSpec {
  id: PartId;
  index: string;
  name: string;
  englishName: string;
  metric: string;
  description: string;
  /** Axial offset along pen length (in scene units, +Y is cap end, -Y is tip end) when explosion = 1 */
  explodedOffsetAxial: number;
  /** Radial offset (X) for side-mounted or inner parts to reveal cleanly */
  explodedOffsetRadialX: number;
  /** Radial offset (Z) */
  explodedOffsetRadialZ: number;
  /** Engineering leader anchor side */
  calloutSide: 'left' | 'right';
}

export const EXPLODED_PARTS: ExplodedPartSpec[] = [
  {
    id: 'cap',
    index: '01',
    name: '按动帽',
    englishName: 'Click Cap',
    metric: '0.35mm 微滚花',
    description: 'Ti-6Al-4V 实心棒料车削，顶面微凹弧度贴合拇指指腹发力。',
    explodedOffsetAxial: 1.52,
    explodedOffsetRadialX: 0,
    explodedOffsetRadialZ: 0,
    calloutSide: 'left',
  },
  {
    id: 'ratchet',
    index: '02',
    name: '双段棘轮',
    englishName: 'Dual-Stage Ratchet',
    metric: '120,000 次寿命',
    description: '高氮马氏体不锈钢精磨棘轮，无塑料易损件，每一下均清晰落位。',
    explodedOffsetAxial: 1.04,
    explodedOffsetRadialX: 0.34,
    explodedOffsetRadialZ: 0,
    calloutSide: 'right',
  },
  {
    id: 'clip',
    index: '03',
    name: '钛合金笔夹',
    englishName: 'Ti-6Al-4V Clip',
    metric: '12° 倒角',
    description: '线切割一体成型弹性悬臂，内藏隐形双星螺钉锁定，可激光刻字。',
    explodedOffsetAxial: 0.56,
    explodedOffsetRadialX: 0.62,
    explodedOffsetRadialZ: 0,
    calloutSide: 'right',
  },
  {
    id: 'sleeve',
    index: '04',
    name: '内置配重套筒',
    englishName: 'Balance Sleeve',
    metric: '重心前移 4mm',
    description: 'CNC 变壁厚黄铜配重腔，将 28.4g 整笔重心精准锚定于虎口前方。',
    explodedOffsetAxial: 0.16,
    explodedOffsetRadialX: -0.58,
    explodedOffsetRadialZ: 0,
    calloutSide: 'left',
  },
  {
    id: 'barrel',
    index: '05',
    name: '主笔管',
    englishName: 'Monobloc Barrel',
    metric: '9.8mm 握径',
    description: '整料深孔枪钻成型，前段 18 道微距防滑环纹替代生硬橡胶套。',
    explodedOffsetAxial: -0.22,
    explodedOffsetRadialX: -0.14,
    explodedOffsetRadialZ: 0,
    calloutSide: 'left',
  },
  {
    id: 'refill',
    index: '06',
    name: '定制大容量笔芯',
    englishName: 'Custom Refill',
    metric: '1,200m 书写长度',
    description: '全金属密封储墨管搭配低粘度油性中性双相墨水，落笔即干不洇纸。',
    explodedOffsetAxial: -0.82,
    explodedOffsetRadialX: 0.44,
    explodedOffsetRadialZ: 0,
    calloutSide: 'right',
  },
  {
    id: 'tip',
    index: '07',
    name: '0.38mm 碳化钨笔尖',
    englishName: 'Tungsten Tip',
    metric: '±0.02mm 零虚位',
    description: '双锥面抱紧式内膛结构，按出笔芯瞬间消除径向晃动与书写杂音。',
    explodedOffsetAxial: -1.46,
    explodedOffsetRadialX: 0,
    explodedOffsetRadialZ: 0,
    calloutSide: 'left',
  },
];

export interface PartOffset {
  id: PartId;
  axial: number;
  radialX: number;
  radialZ: number;
}

/**
 * Computes smoothly eased axial and radial offsets for all 7 pen components
 * given an explosion progress in [0, 1].
 */
export function computeExplodedOffsets(progress: number): Record<PartId, PartOffset> {
  const t = Math.max(0, Math.min(1, progress));
  // Smooth cubic-out curve for crisp mechanical separation
  const eased = 1 - Math.pow(1 - t, 3);
  const result = {} as Record<PartId, PartOffset>;
  for (const part of EXPLODED_PARTS) {
    result[part.id] = {
      id: part.id,
      axial: part.explodedOffsetAxial * eased || 0,
      radialX: part.explodedOffsetRadialX * eased || 0,
      radialZ: part.explodedOffsetRadialZ * eased || 0,
    };
  }
  return result;
}

/**
 * Computes simulated 0.38mm oil-gel neutral ink stroke width (px) from pointer velocity (px/ms).
 * Slower strokes deposit slightly richer ink; faster strokes taper cleanly like a real tungsten tip.
 */
export function computeInkWidth(velocityPxPerMs: number): {
  strokePx: number;
  apparentMm: number;
} {
  const clampedVel = Math.max(0, Math.min(3.0, velocityPxPerMs));
  // Exponential falloff from slow (2.5px) to fast (1.15px)
  const factor = Math.exp(-clampedVel * 1.15);
  const strokePx = Number((1.15 + factor * 1.35).toFixed(2));
  const apparentMm = Number((0.33 + factor * 0.1).toFixed(2));
  return { strokePx, apparentMm };
}

export const MAX_ENGRAVING_LENGTH = 8;

/**
 * Sanitizes and clamps laser engraving text to at most 8 visible characters.
 * Strips control characters and trims leading/trailing newlines.
 */
export function validateEngraving(rawInput: string): {
  sanitized: string;
  length: number;
  remaining: number;
  isValid: boolean;
} {
  // Remove control chars, tabs, newlines
  const cleaned = rawInput.replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
  // Use Array.from so CJK / surrogate pairs count accurately as visual characters
  const chars = Array.from(cleaned).slice(0, MAX_ENGRAVING_LENGTH);
  const sanitized = chars.join('');
  return {
    sanitized,
    length: chars.length,
    remaining: MAX_ENGRAVING_LENGTH - chars.length,
    isValid: chars.length <= MAX_ENGRAVING_LENGTH,
  };
}

export interface OrderSummary {
  orderNumber: string;
  modelCode: string;
  material: PenMaterialSpec;
  engraving: string;
  hasEngraving: boolean;
  unitPriceCny: number;
  engravingFeeCny: number;
  totalCny: number;
  estimatedDispatch: string;
  createdAtLabel: string;
}

export function buildOrderSummary(
  materialId: MaterialId,
  rawEngraving: string,
  nowDate: Date = new Date(),
): OrderSummary {
  const material = PEN_MATERIALS[materialId];
  const { sanitized } = validateEngraving(rawEngraving);
  const trimmedEngraving = sanitized.trim();

  const yy = String(nowDate.getFullYear()).slice(-2);
  const mm = String(nowDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nowDate.getDate()).padStart(2, '0');
  // Deterministic 4-char hash suffix from material + engraving + minute
  const seedStr = `${materialId}:${trimmedEngraving}:${yy}${mm}${dd}${nowDate.getHours()}${nowDate.getMinutes()}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const code = (Math.abs(hash) % 9000 + 1000).toString();

  return {
    orderNumber: `M01-${yy}${mm}${dd}-${code}`,
    modelCode: 'M-01 / Ti-6Al-4V',
    material,
    engraving: trimmedEngraving,
    hasEngraving: trimmedEngraving.length > 0,
    unitPriceCny: material.priceCny,
    engravingFeeCny: 0,
    totalCny: material.priceCny,
    estimatedDispatch: trimmedEngraving.length > 0 ? '定制刻字 · 5 个工作日内顺丰直发' : '标准现货 · 48 小时内顺丰直发',
    createdAtLabel: `${nowDate.getFullYear()}.${mm}.${dd}`,
  };
}
