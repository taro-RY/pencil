export type FloraKind =
  | 'cupBlossom'
  | 'starFlower'
  | 'daisyFlower'
  | 'leafBud';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface BranchCurveSpec {
  id: number;
  points: Vec3Tuple[];
  baseRadius: number;
  tipRadius: number;
  depth: number;
}

export interface FloraInstanceSpec {
  id: number;
  branchId: number;
  kind: FloraKind;
  position: Vec3Tuple;
  rotation: Vec3Tuple;
  maxScale: number;
  colorHex: string;
  swayPhase: number;
  swayAmp: number;
  vitality: number;
  targetVitality: number;
  lushness: number;
  lastTouchedSec: number;
}

export interface InkRibbonPoint {
  x: number;
  y: number;
  width: number;
  age: number;
  maxAge: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePolyline(points: Vec3Tuple[], t: number): { pos: Vec3Tuple; dir: Vec3Tuple } {
  const clamped = Math.max(0, Math.min(1, t));
  const segCount = points.length - 1;
  const scaled = clamped * segCount;
  const idx = Math.min(segCount - 1, Math.floor(scaled));
  const localT = scaled - idx;
  const a = points[idx];
  const b = points[idx + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return {
    pos: {
      x: a.x + dx * localT,
      y: a.y + dy * localT,
      z: a.z + dz * localT,
    },
    dir: { x: dx / len, y: dy / len, z: dz / len },
  };
}

const CUP_BLOSSOM_PALETTE = ['#FFF8F4', '#FAD0D8', '#F2A4B0', '#EB897E', '#FFE6D6'];
const STAR_FLOWER_PALETTE = ['#9BC8F6', '#C2B8EE', '#F7DE88', '#CEE4FC'];
const DAISY_PALETTE = ['#FFFDF8', '#FBF4DA', '#FCE4EA'];
const LEAF_BUD_PALETTE = ['#589464', '#72AE76', '#8DC488'];

/**
 * Generates clean, sculpted 3D ink-plum winter branches fixed outside the pen & headline
 * with sparse, poetic blossoms and tender leaf buds (no messy moss or grass clutter).
 */
export function generateSpringGardenLayout(seed = 20261118): {
  branches: BranchCurveSpec[];
  flora: FloraInstanceSpec[];
} {
  const rand = mulberry32(seed);
  const branches: BranchCurveSpec[] = [];
  const flora: FloraInstanceSpec[] = [];
  let branchId = 1;
  let floraId = 1;

  const addBranch = (
    p0: Vec3Tuple,
    dir: Vec3Tuple,
    length: number,
    baseRadius: number,
    depth: number,
    maxDepth: number,
  ) => {
    if (depth > maxDepth || length < 0.48) return;

    const pts: Vec3Tuple[] = [p0];
    let cur = { ...p0 };
    let curDir = { ...dir };
    const steps = 4;
    for (let s = 1; s <= steps; s++) {
      const segLen = length / steps;
      curDir = {
        x: curDir.x + (rand() - 0.5) * 0.24,
        y: curDir.y + (rand() - 0.5) * 0.24 + (depth >= 2 ? 0.04 : 0),
        z: curDir.z + (rand() - 0.5) * 0.14,
      };
      const norm = Math.hypot(curDir.x, curDir.y, curDir.z) || 1;
      curDir = { x: curDir.x / norm, y: curDir.y / norm, z: curDir.z / norm };
      cur = {
        x: cur.x + curDir.x * segLen,
        y: cur.y + curDir.y * segLen,
        z: cur.z + curDir.z * segLen,
      };
      if (cur.x < 0 && cur.x > -1.8) cur.x = -1.8;
      if (cur.x > 0 && cur.x < 1.98) cur.x = 1.98;
      if (cur.y < -1.02) cur.y = -1.02;
      pts.push(cur);
    }

    const tipRadius = baseRadius * 0.62;
    const thisBranchId = branchId++;
    branches.push({
      id: thisBranchId,
      points: pts,
      baseRadius,
      tipRadius,
      depth,
    });

    // Clean, sparse blossom clusters + occasional small leaf bud (no moss clutter)
    const count = depth === 1 ? 6 : depth === 2 ? 12 : 16;
    for (let i = 0; i < count; i++) {
      const t = 0.14 + rand() * 0.84;
      const sample = samplePolyline(pts, t);
      const roll = rand();
      let kind: FloraKind = 'cupBlossom';
      if (depth === 1) {
        kind = roll > 0.45 ? 'leafBud' : 'cupBlossom';
      } else if (roll > 0.45) {
        kind = 'cupBlossom';
      } else if (roll > 0.26) {
        kind = 'starFlower';
      } else if (roll > 0.12) {
        kind = 'daisyFlower';
      } else {
        kind = 'leafBud';
      }

      const orbitAngle = rand() * Math.PI * 2;
      const radialOffset = baseRadius * (1.05 - t * 0.2) + rand() * 0.1;
      const pos: Vec3Tuple = {
        x: sample.pos.x + Math.cos(orbitAngle) * radialOffset,
        y: sample.pos.y + Math.sin(orbitAngle) * radialOffset,
        z: sample.pos.z + (rand() - 0.5) * 0.12,
      };

      let colorHex = '#FAD0D8';
      let maxScale = 0.82 + rand() * 0.55;
      let rot: Vec3Tuple = {
        x: 0.28 + (rand() - 0.5) * 0.8,
        y: rand() * Math.PI * 2,
        z: (rand() - 0.5) * 0.75,
      };

      if (kind === 'cupBlossom') {
        colorHex = CUP_BLOSSOM_PALETTE[Math.floor(rand() * CUP_BLOSSOM_PALETTE.length)];
        maxScale = 0.82 + rand() * 0.65;
      } else if (kind === 'starFlower') {
        colorHex = STAR_FLOWER_PALETTE[Math.floor(rand() * STAR_FLOWER_PALETTE.length)];
        maxScale = 0.72 + rand() * 0.48;
      } else if (kind === 'daisyFlower') {
        colorHex = DAISY_PALETTE[Math.floor(rand() * DAISY_PALETTE.length)];
        maxScale = 0.75 + rand() * 0.48;
      } else {
        colorHex = LEAF_BUD_PALETTE[Math.floor(rand() * LEAF_BUD_PALETTE.length)];
        maxScale = 0.68 + rand() * 0.42;
        rot = {
          x: (rand() - 0.5) * 0.7,
          y: rand() * Math.PI * 2,
          z: (rand() - 0.5) * 0.9,
        };
      }

      flora.push({
        id: floraId++,
        branchId: thisBranchId,
        kind,
        position: pos,
        rotation: rot,
        maxScale,
        colorHex,
        swayPhase: rand() * Math.PI * 2,
        swayAmp: 0.04 + rand() * 0.06,
        vitality: 0,
        targetVitality: 0,
        lushness: 0,
        lastTouchedSec: -10,
      });
    }

    const endPt = pts[pts.length - 1];
    const midPt = pts[Math.floor(pts.length * 0.56)];

    const d1 = {
      x: curDir.x + (rand() - 0.42) * 0.34,
      y: curDir.y + 0.14 + (rand() - 0.5) * 0.22,
      z: curDir.z + (rand() - 0.5) * 0.18,
    };
    const n1 = Math.hypot(d1.x, d1.y, d1.z) || 1;
    addBranch(
      endPt,
      { x: d1.x / n1, y: d1.y / n1, z: d1.z / n1 },
      length * 0.7,
      tipRadius,
      depth + 1,
      maxDepth,
    );

    const d2 = {
      x: curDir.x - 0.22 + (rand() - 0.5) * 0.28,
      y: curDir.y + (rand() - 0.5) * 0.36,
      z: curDir.z + (rand() - 0.5) * 0.2,
    };
    const n2 = Math.hypot(d2.x, d2.y, d2.z) || 1;
    addBranch(
      midPt,
      { x: d2.x / n2, y: d2.y / n2, z: d2.z / n2 },
      length * 0.58,
      baseRadius * 0.55,
      depth + 1,
      maxDepth,
    );
  };

  // Left sculpted plum bough framing cleanly above bottom headline
  addBranch({ x: -5.3, y: -0.52, z: -1.0 }, { x: 0.88, y: 0.42, z: 0.1 }, 2.05, 0.064, 1, 3);

  // Upper-right winter bough framing the pen clip cleanly
  addBranch({ x: 5.3, y: 1.5, z: -0.98 }, { x: -0.88, y: -0.32, z: 0.1 }, 1.9, 0.058, 1, 3);

  // Lower-right slender blossom twig above bottom-right price
  addBranch({ x: 5.05, y: -0.74, z: -0.92 }, { x: -0.86, y: 0.38, z: 0.08 }, 1.5, 0.045, 2, 3);

  return { branches, flora };
}

export function awakenFloraNearWorldPoint(
  flora: FloraInstanceSpec[],
  wx: number,
  wy: number,
  radius: number,
  nowSec: number,
  dwellBoost = 0.28,
): boolean {
  const rSq = radius * radius;
  const haloSq = (radius * 1.55) ** 2;
  let awakenedAny = false;

  for (const f of flora) {
    const dx = f.position.x - wx;
    const dy = f.position.y - wy;
    const distSq = dx * dx + dy * dy;
    if (distSq <= rSq) {
      if (f.targetVitality < 0.9) awakenedAny = true;
      f.targetVitality = 1;
      if (f.vitality < 0.34) {
        f.vitality = 0.34;
        awakenedAny = true;
      }
      f.lastTouchedSec = nowSec;
      f.lushness = Math.min(1, f.lushness + dwellBoost);
    } else if (distSq <= haloSq) {
      if (f.targetVitality < 0.6) awakenedAny = true;
      f.targetVitality = Math.max(f.targetVitality, 0.78);
      if (f.vitality < 0.16) {
        f.vitality = 0.16;
        awakenedAny = true;
      }
      f.lastTouchedSec = Math.max(f.lastTouchedSec, nowSec - 0.35);
      f.lushness = Math.min(1, f.lushness + dwellBoost * 0.45);
    }
  }
  return awakenedAny;
}

export function stepFloraGarden(
  flora: FloraInstanceSpec[],
  dt: number,
  nowSec: number,
  persistAll = false,
  holdSec = 1.65,
): boolean {
  let active = false;
  const growRate = dt * 6.2;
  const decayRate = dt * 0.56;

  for (const f of flora) {
    if (persistAll) {
      f.targetVitality = 1;
      f.lushness = Math.min(1, f.lushness + dt * 0.65);
      f.lastTouchedSec = nowSec;
    } else if (f.targetVitality > 0 && nowSec - f.lastTouchedSec > holdSec) {
      f.targetVitality = Math.max(0, f.targetVitality - decayRate);
      f.lushness = Math.max(0, f.lushness - decayRate);
      active = true;
    }

    if (f.vitality < f.targetVitality) {
      f.vitality = Math.min(f.targetVitality, f.vitality + growRate);
      active = true;
    } else if (f.vitality > f.targetVitality) {
      f.vitality = Math.max(f.targetVitality, f.vitality - decayRate * 1.15);
      active = true;
    }
  }

  return active;
}

export function getFloraBloomRatio(flora: FloraInstanceSpec[]): number {
  if (flora.length === 0) return 0;
  let sum = 0;
  for (const f of flora) sum += f.vitality;
  return sum / flora.length;
}
