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

function createCurvedBladeGeo(
  length: number,
  width: number,
  arch: number,
  cup: number,
  segs = 5,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 2, segs);
  geo.translate(0, length * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / length));
    const taper = Math.sin(Math.pow(t, 0.62) * Math.PI);
    const nx = x * (0.22 + 0.88 * taper);
    const zBend = Math.pow(t, 1.65) * arch + Math.abs(x / (width * 0.5 || 1)) * cup * taper;
    pos.setXYZ(i, nx, y, zBend);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildCupBlossomGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = createCurvedBladeGeo(0.16, 0.13, -0.055, 0.028, 4);
    p.rotateX(0.95);
    p.rotateY((i / 5) * Math.PI * 2);
    parts.push(p);
  }
  for (let i = 0; i < 5; i++) {
    const p = createCurvedBladeGeo(0.112, 0.092, -0.045, 0.022, 4);
    p.rotateX(0.62);
    p.rotateY(((i + 0.5) / 5) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function buildStarFlowerGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const p = createCurvedBladeGeo(0.125, 0.062, -0.022, 0.014, 3);
    p.rotateX(1.2);
    p.rotateY((i / 6) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function buildDaisyFlowerGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = createCurvedBladeGeo(0.145, 0.038, -0.018, 0.008, 3);
    p.rotateX(1.32);
    p.rotateY((i / count) * Math.PI * 2);
    parts.push(p);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function buildLeafBudGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const left = createCurvedBladeGeo(0.135, 0.052, 0.025, 0.01, 4);
  left.rotateX(0.7);
  left.rotateZ(0.42);
  parts.push(left);

  const right = createCurvedBladeGeo(0.108, 0.042, 0.02, 0.008, 4);
  right.rotateX(0.65);
  right.rotateZ(-0.48);
  right.rotateY(1.2);
  parts.push(right);

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

export function createSpringGarden3D(): SpringGarden3DHandle {
  const group = new THREE.Group();
  group.name = 'Spring_Garden_3D';

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

  // 2. Clean 3D Blossoms & Delicate Leaf Buds
  const speciesGeos: Record<FloraKind, THREE.BufferGeometry> = {
    cupBlossom: buildCupBlossomGeo(),
    starFlower: buildStarFlowerGeo(),
    daisyFlower: buildDaisyFlowerGeo(),
    leafBud: buildLeafBudGeo(),
  };

  const floraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  });

  const stamenGeo = new THREE.SphereGeometry(0.03, 8, 6);
  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xf4c76b,
    emissive: 0x6b4810,
    emissiveIntensity: 0.4,
    roughness: 0.35,
    transparent: true,
    opacity: 1,
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
    const im = new THREE.InstancedMesh(speciesGeos[kind], floraMat, items.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    items.forEach((item, idx) => {
      colorTmp.set(item.colorHex);
      im.setColorAt(idx, colorTmp);
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    instancedMeshes[kind] = im;
    group.add(im);
  });

  // 3. Soft Golden Pollen Spores floating gently near active blooms
  const pollenCount = 48;
  const pollenPos = new Float32Array(pollenCount * 3);
  const pollenBase = new Float32Array(pollenCount * 3);
  for (let i = 0; i < pollenCount; i++) {
    const src = flora[(i * 5) % flora.length];
    const px = src.position.x + Math.sin(i * 3.1) * 0.32;
    const py = src.position.y + Math.cos(i * 2.3) * 0.32;
    const pz = src.position.z + Math.sin(i * 1.7) * 0.22;
    pollenBase[i * 3] = px;
    pollenBase[i * 3 + 1] = py;
    pollenBase[i * 3 + 2] = pz;
    pollenPos[i * 3] = px;
    pollenPos[i * 3 + 1] = py;
    pollenPos[i * 3 + 2] = pz;
  }
  const pollenGeo = new THREE.BufferGeometry();
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  const pollenMat = new THREE.PointsMaterial({
    color: 0xf7dca2,
    size: 0.045,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pollenPts = new THREE.Points(pollenGeo, pollenMat);
  group.add(pollenPts);

  const dummy = new THREE.Object3D();
  const syncInstances = (nowSec: number) => {
    let stamenIdx = 0;
    const globalRatio = getFloraBloomRatio(flora);

    // Rich dark aged plum-wood bark (linear RGB)
    barkMat.color.setRGB(
      0.024 + globalRatio * 0.008,
      0.017 + globalRatio * 0.006,
      0.014 + globalRatio * 0.004,
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
        const lushScale = 1 + item.lushness * 0.2;
        const sc = item.maxScale * springEase * lushScale;

        const sway =
          Math.sin(nowSec * 1.85 + item.swayPhase) * item.swayAmp * (0.4 + v * 0.6);

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
          dummy.scale.set(sc * 0.92, sc * 0.92, sc * 0.92);
          dummy.updateMatrix();
          stamenMesh.setMatrixAt(stamenIdx++, dummy.matrix);
        }
      }
      im.instanceMatrix.needsUpdate = true;
    });
    stamenMesh.instanceMatrix.needsUpdate = true;

    const posAttr = pollenGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pollenCount; i++) {
      const bx = pollenBase[i * 3];
      const by = pollenBase[i * 3 + 1];
      const bz = pollenBase[i * 3 + 2];
      posAttr.setXYZ(
        i,
        bx + Math.sin(nowSec * 0.7 + i) * 0.14,
        by + Math.cos(nowSec * 0.55 + i * 1.3) * 0.16,
        bz + Math.sin(nowSec * 0.4 + i * 0.9) * 0.08,
      );
    }
    posAttr.needsUpdate = true;
    pollenMat.opacity = Math.min(0.62, globalRatio * 1.25) * barkMat.opacity;
  };

  syncInstances(0);

  const awakenAtWorld = (
    wx: number,
    wy: number,
    radius: number,
    nowSec: number,
    boost = 0.24,
  ) => awakenFloraNearWorldPoint(flora, wx, wy, radius, nowSec, boost);

  const step = (dt: number, nowSec: number, persistAll: boolean): boolean => {
    const active = stepFloraGarden(flora, dt, nowSec, persistAll, 1.65);
    syncInstances(nowSec);
    return active || getFloraBloomRatio(flora) > 0.01;
  };

  const setVisibilityAlpha = (alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    group.visible = a > 0.015;
    barkMat.opacity = a;
    floraMat.opacity = a;
    stamenMat.opacity = a;
  };

  const resetDormant = () => {
    for (const f of flora) {
      f.vitality = 0;
      f.targetVitality = 0;
      f.lushness = 0;
      f.lastTouchedSec = -10;
    }
    syncInstances(0);
  };

  const dispose = () => {
    branchGeos.forEach((g) => g.dispose());
    Object.values(speciesGeos).forEach((g) => g.dispose());
    stamenGeo.dispose();
    pollenGeo.dispose();
    barkMat.dispose();
    floraMat.dispose();
    stamenMat.dispose();
    pollenMat.dispose();
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
