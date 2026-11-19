import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FloraInstanceSpec,
  FloraKind,
  awakenFloraNearWorldPoint,
  generateSpringGardenLayout,
  getFloraBloomRatio,
  stepFloraGarden,
} from '../utils/botanicalInk';

export interface SpringGarden3DHandle {
  group: THREE.Group;
  flora: FloraInstanceSpec[];
  awakenAtWorld: (wx: number, wy: number, radius: number, nowSec: number, boost?: number) => boolean;
  step: (dt: number, nowSec: number, persistAll: boolean) => boolean;
  setVisibilityAlpha: (alpha: number) => void;
  getBloomRatio: () => number;
  resetDormant: () => void;
  dispose: () => void;
}

/**
 * Generates a soft painterly watercolor petal CanvasTexture (white/ivory base so
 * instanceColor tints each blossom smoothly without harsh polygon edges).
 */
function createWatercolorPetalTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size * 0.5;

    ctx.save();
    // Classic notched plum / cherry petal silhouette
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.94);
    ctx.bezierCurveTo(size * 0.14, size * 0.72, size * 0.12, size * 0.24, cx - size * 0.08, size * 0.08);
    ctx.quadraticCurveTo(cx, size * 0.17, cx + size * 0.08, size * 0.08);
    ctx.bezierCurveTo(size * 0.88, size * 0.24, size * 0.86, size * 0.72, cx, size * 0.94);
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, size * 0.42, size * 0.04, cx, size * 0.5, size * 0.48);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    grad.addColorStop(0.62, 'rgba(255, 248, 250, 0.88)');
    grad.addColorStop(1, 'rgba(255, 232, 238, 0.22)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Soft petal veins
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 1.2;
    for (let v = -2; v <= 2; v++) {
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.9);
      ctx.quadraticCurveTo(cx + v * 7, size * 0.55, cx + v * 12, size * 0.24);
      ctx.stroke();
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createWatercolorLeafTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.94);
    ctx.quadraticCurveTo(size * 0.16, size * 0.5, cx, size * 0.06);
    ctx.quadraticCurveTo(size * 0.84, size * 0.5, cx, size * 0.94);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, size, 0, 0);
    grad.addColorStop(0, 'rgba(220, 240, 224, 0.85)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.94)');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSingleCurvedPetalGeo(
  length: number,
  width: number,
  arch: number,
  cup: number,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 3, 5);
  geo.translate(0, length * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / length));
    const zBend = Math.pow(t, 1.55) * arch + Math.abs(x / (width * 0.5 || 1)) * cup * Math.sin(t * Math.PI);
    pos.setXYZ(i, x, y, zBend);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildFivePetalBlossomGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = createSingleCurvedPetalGeo(0.21, 0.18, -0.048, 0.022);
    p.rotateX(1.12);
    p.rotateY((i / 5) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.rotateX(Math.PI * 0.5);
  return merged;
}

function buildDoublePetalBlossomGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = createSingleCurvedPetalGeo(0.2, 0.17, -0.044, 0.02);
    p.rotateX(1.16);
    p.rotateY((i / 5) * Math.PI * 2);
    parts.push(p);
  }
  for (let i = 0; i < 5; i++) {
    const p = createSingleCurvedPetalGeo(0.145, 0.13, -0.036, 0.016);
    p.rotateX(0.84);
    p.rotateY(((i + 0.5) / 5) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.rotateX(Math.PI * 0.5);
  return merged;
}

function buildAiryDaisyPetalGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const p = createSingleCurvedPetalGeo(0.185, 0.135, -0.032, 0.014);
    p.rotateX(1.22);
    p.rotateY((i / 6) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.rotateX(Math.PI * 0.5);
  return merged;
}

function buildLeafBudGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const left = createSingleCurvedPetalGeo(0.15, 0.085, 0.025, 0.01);
  left.rotateX(0.75);
  left.rotateZ(0.45);
  parts.push(left);

  const right = createSingleCurvedPetalGeo(0.12, 0.07, 0.02, 0.008);
  right.rotateX(0.7);
  right.rotateZ(-0.5);
  right.rotateY(1.2);
  parts.push(right);

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.rotateX(Math.PI * 0.42);
  return merged;
}

interface DriftingPetalState {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  scale: number;
  phase: number;
}

export function createSpringGarden3D(): SpringGarden3DHandle {
  const group = new THREE.Group();
  group.name = 'Spring_Garden_3D';
  group.renderOrder = -1;

  const { branches, flora } = generateSpringGardenLayout();

  // 1. Clean Dark Ink-Plum Winter Bark Branches
  const branchGroup = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x241c17,
    roughness: 0.92,
    metalness: 0.02,
    transparent: true,
    opacity: 1,
  });

  const branchGeos: THREE.BufferGeometry[] = [];
  for (const b of branches) {
    const curve = new THREE.CatmullRomCurve3(
      b.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    );
    const tube = new THREE.TubeGeometry(curve, 18, b.baseRadius, 8, false);
    const pos = tube.attributes.position;
    const center = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const segIdx = Math.floor(i / 9);
      const t = Math.min(1, segIdx / 18);
      curve.getPointAt(t, center);
      const vx = pos.getX(i) - center.x;
      const vy = pos.getY(i) - center.y;
      const vz = pos.getZ(i) - center.z;
      const scale = THREE.MathUtils.lerp(1.0, b.tipRadius / b.baseRadius, t);
      pos.setXYZ(i, center.x + vx * scale, center.y + vy * scale, center.z + vz * scale);
    }
    tube.computeVertexNormals();
    branchGeos.push(tube);
    const mesh = new THREE.Mesh(tube, barkMat);
    branchGroup.add(mesh);
  }
  group.add(branchGroup);

  // 2. Soft Watercolor-Textured Petals & Delicate Buds
  const petalTex = createWatercolorPetalTexture();
  const leafTex = createWatercolorLeafTexture();

  const speciesGeos: Record<FloraKind, THREE.BufferGeometry> = {
    cupBlossom: buildDoublePetalBlossomGeo(),
    starFlower: buildFivePetalBlossomGeo(),
    daisyFlower: buildAiryDaisyPetalGeo(),
    leafBud: buildLeafBudGeo(),
  };

  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: petalTex,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });

  const leafMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: leafTex,
    alphaTest: 0.06,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const stamenGeo = new THREE.SphereGeometry(0.024, 8, 6);
  stamenGeo.translate(0, 0, 0.035);
  const stamenMat = new THREE.MeshBasicMaterial({
    color: 0xd99124,
    transparent: true,
    opacity: 0.94,
  });

  const groupedFlora: Record<FloraKind, FloraInstanceSpec[]> = {
    cupBlossom: [],
    starFlower: [],
    daisyFlower: [],
    leafBud: [],
  };
  for (const f of flora) {
    groupedFlora[f.kind].push(f);
  }

  const instancedMeshes: Partial<Record<FloraKind, THREE.InstancedMesh>> = {};
  const flowerCoreCount =
    groupedFlora.cupBlossom.length +
    groupedFlora.starFlower.length +
    groupedFlora.daisyFlower.length;
  const stamenMesh = new THREE.InstancedMesh(
    stamenGeo,
    stamenMat,
    Math.max(1, flowerCoreCount),
  );
  stamenMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stamenMesh.frustumCulled = false;
  group.add(stamenMesh);

  const colorTmp = new THREE.Color();
  (Object.keys(groupedFlora) as FloraKind[]).forEach((kind) => {
    const items = groupedFlora[kind];
    if (items.length === 0) return;
    const mat = kind === 'leafBud' ? leafMat : petalMat;
    const im = new THREE.InstancedMesh(speciesGeos[kind], mat, items.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    items.forEach((item, idx) => {
      // Soft sakura/plum blush palette on all blossom petals for poetic petal harmony
      if (kind === 'leafBud') {
        colorTmp.set(item.colorHex);
      } else {
        const blushPalette = ['#FFE8EE', '#F6B0C2', '#EA8AA4', '#FFD6CE', '#E27996'];
        colorTmp.set(blushPalette[idx % blushPalette.length]);
      }
      im.setColorAt(idx, colorTmp);
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    instancedMeshes[kind] = im;
    group.add(im);
  });

  // 3. Drifting Loose Petals fluttering gracefully from awakened blossoms
  const driftingCount = 22;
  const singlePetalGeo = createSingleCurvedPetalGeo(0.18, 0.14, -0.04, 0.018);
  const driftingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: petalTex,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const driftingMesh = new THREE.InstancedMesh(singlePetalGeo, driftingMat, driftingCount);
  driftingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  driftingMesh.frustumCulled = false;
  const driftingColors = ['#FFEAF0', '#F7B4C4', '#EB8DA6', '#FFD9D0'];
  for (let i = 0; i < driftingCount; i++) {
    colorTmp.set(driftingColors[i % driftingColors.length]);
    driftingMesh.setColorAt(i, colorTmp);
  }
  if (driftingMesh.instanceColor) driftingMesh.instanceColor.needsUpdate = true;
  group.add(driftingMesh);

  const driftingStates: DriftingPetalState[] = Array.from({ length: driftingCount }, (_, i) => ({
    active: false,
    life: 0,
    maxLife: 2.8 + (i % 5) * 0.45,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
    scale: 0.75 + (i % 4) * 0.18,
    phase: i * 1.13,
  }));
  let nextDriftSlot = 0;
  let lastSpawnTime = -1;

  const spawnDriftPetal = (wx: number, wy: number, wz: number, nowSec: number) => {
    const slot = driftingStates[nextDriftSlot];
    nextDriftSlot = (nextDriftSlot + 1) % driftingCount;
    const h1 = Math.sin(nowSec * 37.1 + nextDriftSlot * 1.9);
    const h2 = Math.cos(nowSec * 23.7 + nextDriftSlot * 2.7);
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 2.6 + Math.abs(h1) * 1.8;
    slot.x = wx + h1 * 0.28;
    slot.y = wy + h2 * 0.18;
    slot.z = wz + 0.08 + h1 * 0.12;
    slot.vx = (wx < 0 ? 0.24 : -0.24) + h1 * 0.22;
    slot.vy = -0.22 - Math.abs(h2) * 0.18;
    slot.vz = h2 * 0.08;
    slot.rx = h1 * 1.4;
    slot.ry = h2 * 2.2;
    slot.rz = h1 * 1.8;
    slot.spinX = 0.8 + h1 * 1.1;
    slot.spinY = 1.2 + h2 * 1.4;
    slot.spinZ = 0.7 - h1 * 0.9;
  };

  const dummy = new THREE.Object3D();
  const syncInstances = (dt: number, nowSec: number, persistAll: boolean) => {
    let stamenIdx = 0;
    const globalRatio = getFloraBloomRatio(flora);

    barkMat.color.setRGB(
      0.14 + globalRatio * 0.03,
      0.10 + globalRatio * 0.025,
      0.08 + globalRatio * 0.02,
    );

    (Object.keys(groupedFlora) as FloraKind[]).forEach((kind) => {
      const im = instancedMeshes[kind];
      const items = groupedFlora[kind];
      if (!im || items.length === 0) return;

      const hasCore = kind !== 'leafBud';

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const v = item.vitality;
        if (v <= 0.005) {
          dummy.position.set(item.position.x, item.position.y, item.position.z);
          dummy.scale.set(0.0001, 0.0001, 0.0001);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
          if (hasCore) stamenMesh.setMatrixAt(stamenIdx++, dummy.matrix);
          continue;
        }

        const t = Math.min(1, v);
        const springEase = 1 - Math.pow(1 - t, 3);
        const lushScale = 1 + item.lushness * 0.18;
        const sc = item.maxScale * springEase * lushScale;

        const sway =
          Math.sin(nowSec * 1.7 + item.swayPhase) * item.swayAmp * (0.4 + v * 0.6);

        dummy.position.set(item.position.x, item.position.y, item.position.z);
        dummy.rotation.set(
          item.rotation.x + sway * 0.65,
          item.rotation.y + sway * 0.35,
          item.rotation.z + sway,
        );
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);

        if (hasCore) {
          dummy.scale.set(sc * 0.85, sc * 0.85, sc * 0.85);
          dummy.updateMatrix();
          stamenMesh.setMatrixAt(stamenIdx++, dummy.matrix);
        }
      }
      im.instanceMatrix.needsUpdate = true;
    });
    stamenMesh.instanceMatrix.needsUpdate = true;

    // Gentle ambient petal breeze in persistAll mode
    if (persistAll && nowSec - lastSpawnTime > 0.24) {
      lastSpawnTime = nowSec;
      const src = flora[Math.floor((nowSec * 13) % flora.length)];
      if (src && src.kind !== 'leafBud') {
        spawnDriftPetal(src.position.x, src.position.y, src.position.z, nowSec);
      }
    }

    let driftActive = false;
    for (let i = 0; i < driftingCount; i++) {
      const p = driftingStates[i];
      if (!p.active) {
        dummy.position.set(0, -20, 0);
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.updateMatrix();
        driftingMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        dummy.position.set(0, -20, 0);
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.updateMatrix();
        driftingMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      driftActive = true;
      const u = p.life / p.maxLife;
      const env = Math.sin(Math.min(1, u) * Math.PI);
      const flutter = Math.sin(nowSec * 3.4 + p.phase) * 0.38;
      p.x += (p.vx + flutter * 0.35) * dt;
      p.y += (p.vy + Math.cos(nowSec * 2.5 + p.phase) * 0.06) * dt;
      p.z += p.vz * dt;
      p.rx += p.spinX * dt;
      p.ry += p.spinY * dt;
      p.rz += p.spinZ * dt;

      const sc = p.scale * (0.45 + 0.75 * env);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      driftingMesh.setMatrixAt(i, dummy.matrix);
    }
    driftingMesh.instanceMatrix.needsUpdate = true;

    return driftActive;
  };

  syncInstances(0, 0, false);

  const awakenAtWorld = (
    wx: number,
    wy: number,
    radius: number,
    nowSec: number,
    boost = 0.24,
  ) => {
    const awakened = awakenFloraNearWorldPoint(flora, wx, wy, radius, nowSec, boost);
    if (nowSec - lastSpawnTime > 0.11) {
      const rSq = (radius * 1.15) ** 2;
      const nearBranch = awakened || flora.some((f) => {
        const dx = f.position.x - wx;
        const dy = f.position.y - wy;
        return dx * dx + dy * dy <= rSq;
      });
      if (nearBranch) {
        lastSpawnTime = nowSec;
        spawnDriftPetal(wx, wy, -1.65, nowSec);
      }
    }
    return awakened;
  };

  const step = (dt: number, nowSec: number, persistAll: boolean): boolean => {
    const active = stepFloraGarden(flora, dt, nowSec, persistAll, 2.6);
    const driftActive = syncInstances(dt, nowSec, persistAll);
    return active || driftActive || getFloraBloomRatio(flora) > 0.01;
  };

  const setVisibilityAlpha = (alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    group.visible = a > 0.015;
    barkMat.opacity = a;
    petalMat.opacity = 0.92 * a;
    driftingMat.opacity = 0.88 * a;
    leafMat.opacity = 0.88 * a;
    stamenMat.opacity = 0.92 * a;
  };

  const resetDormant = () => {
    for (const f of flora) {
      f.vitality = 0;
      f.targetVitality = 0;
      f.lushness = 0;
      f.lastTouchedSec = -10;
    }
    for (const d of driftingStates) {
      d.active = false;
    }
    syncInstances(0, 0, false);
  };

  const dispose = () => {
    branchGeos.forEach((g) => g.dispose());
    Object.values(speciesGeos).forEach((g) => g.dispose());
    singlePetalGeo.dispose();
    stamenGeo.dispose();
    petalTex.dispose();
    leafTex.dispose();
    barkMat.dispose();
    petalMat.dispose();
    driftingMat.dispose();
    leafMat.dispose();
    stamenMat.dispose();
  };

  return {
    group,
    flora,
    awakenAtWorld,
    step,
    setVisibilityAlpha,
    getBloomRatio: () => getFloraBloomRatio(flora),
    resetDormant,
    dispose,
  };
}
