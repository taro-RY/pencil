import * as THREE from 'three';
import {
  MaterialId,
  PEN_MATERIALS,
  PartId,
  computeExplodedOffsets,
} from '../utils/penConfig';
import {
  SurfaceTextureSet,
  createEngravingPlateTexture,
  createSurfaceTextureSet,
} from './penTextures';

export interface PenAssemblyHandle {
  root: THREE.Group;
  parts: Record<PartId, THREE.Group>;
  partAnchors: Record<PartId, THREE.Vector3>;
  capHitMesh: THREE.Mesh;
  applyMaterial: (materialId: MaterialId) => void;
  updateEngraving: (text: string, materialId: MaterialId) => void;
  setExplosionProgress: (progress: number) => void;
  setClickerExtension: (clickTravel: number, tipExtendedAmount: number) => void;
  dispose: () => void;
}

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  private radius: number;
  private height: number;
  private turns: number;

  constructor(radius: number, height: number, turns: number) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * Math.PI * 2 * this.turns;
    const x = Math.cos(angle) * this.radius;
    const z = Math.sin(angle) * this.radius;
    const y = (t - 0.5) * this.height;
    return optionalTarget.set(x, y, z);
  }
}

/**
 * Builds the complete 7-part CNC-machined M-01 Titanium Precision Pen assembly.
 * Axis convention: +Y is the click cap end (+2.65), -Y is the 0.38mm tip (-2.55).
 * Total assembled length ~5.20 units (proportional to 142mm x 9.8mm).
 */
export function buildPenAssembly(
  initialMaterialId: MaterialId,
  maxAnisotropy: number,
  initialEngraving = '',
): PenAssemblyHandle {
  const root = new THREE.Group();
  root.name = 'M01_Pen_Root';

  // Cache procedural surface texture sets once
  const textureSets: Record<'bead-blasted' | 'dlc-matte' | 'brushed', SurfaceTextureSet> = {
    'bead-blasted': createSurfaceTextureSet('bead-blasted', maxAnisotropy),
    'dlc-matte': createSurfaceTextureSet('dlc-matte', maxAnisotropy),
    brushed: createSurfaceTextureSet('brushed', maxAnisotropy),
  };

  const initialSpec = PEN_MATERIALS[initialMaterialId];
  const initialTex = textureSets[initialSpec.pbr.surfaceTexture];

  // Primary exterior finish material (Barrel, Cap, Tip Nose, Clip)
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: initialSpec.pbr.colorHex,
    metalness: initialSpec.pbr.metalness,
    roughness: initialSpec.pbr.roughness,
    anisotropy: initialSpec.pbr.anisotropy,
    clearcoat: initialSpec.pbr.clearcoat,
    clearcoatRoughness: initialSpec.pbr.clearcoatRoughness,
    roughnessMap: initialTex.roughnessMap,
    bumpMap: initialTex.bumpMap,
    bumpScale: 0.004,
    envMapIntensity: 1.05,
  });

  // Secondary chamfer / clip accent material (subtle contrast step)
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: initialSpec.pbr.accentHex,
    metalness: Math.min(0.98, initialSpec.pbr.metalness + 0.04),
    roughness: Math.max(0.14, initialSpec.pbr.roughness - 0.1),
    anisotropy: Math.max(0.4, initialSpec.pbr.anisotropy),
    clearcoat: 0.14,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.12,
  });

  // Internal C36000 Brass balance sleeve (always warm machined brass)
  const brassSleeveMat = new THREE.MeshPhysicalMaterial({
    color: 0xc99c52,
    metalness: 0.96,
    roughness: 0.22,
    anisotropy: 0.85,
    roughnessMap: textureSets.brushed.roughnessMap,
    bumpMap: textureSets.brushed.bumpMap,
    bumpScale: 0.003,
    envMapIntensity: 1.35,
  });

  // Internal High-Nitrogen Stainless Steel (Ratchet & Refill tube)
  const steelMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4d8de,
    metalness: 0.96,
    roughness: 0.18,
    anisotropy: 0.65,
    envMapIntensity: 1.4,
  });

  // Dark Tungsten Carbide 0.38mm tip & seal ring
  const tungstenMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b3e45,
    metalness: 0.92,
    roughness: 0.14,
    clearcoat: 0.3,
    envMapIntensity: 1.5,
  });

  // Crimson anodized indicator / ink seal ring on refill
  const sealMat = new THREE.MeshStandardMaterial({
    color: 0x8f2d24,
    metalness: 0.35,
    roughness: 0.45,
  });

  // Engraving back-plate material
  let engravingTex = createEngravingPlateTexture(
    initialEngraving,
    initialMaterialId,
    maxAnisotropy,
  );
  const engravingMat = new THREE.MeshStandardMaterial({
    map: engravingTex,
    metalness: 0.72,
    roughness: 0.36,
    envMapIntensity: 1.1,
  });

  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    g.computeVertexNormals();
    if (g.attributes.uv && g.index) {
      try {
        g.computeTangents();
      } catch {
        // Non-critical if tangent computation is skipped on open caps
      }
    }
    geometries.push(g);
    return g;
  };

  // ------------------------------------------------------------------
  // PART 01: Click Cap (按动帽)
  // ------------------------------------------------------------------
  const capGroup = new THREE.Group();
  capGroup.name = 'cap';
  const capProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 2.66), // concave thumb center
    new THREE.Vector2(0.06, 2.665),
    new THREE.Vector2(0.11, 2.685),
    new THREE.Vector2(0.142, 2.675), // 12 deg top chamfer
    new THREE.Vector2(0.152, 2.64),
    new THREE.Vector2(0.152, 2.46),
    new THREE.Vector2(0.144, 2.45), // micro groove
    new THREE.Vector2(0.152, 2.44),
    new THREE.Vector2(0.152, 2.28),
    new THREE.Vector2(0.13, 2.26), // stepped plunger collar
    new THREE.Vector2(0.13, 2.08),
    new THREE.Vector2(0.05, 2.08), // inner push stem
    new THREE.Vector2(0.05, 1.98),
    new THREE.Vector2(0.0, 1.98),
  ];
  const capGeo = trackGeo(new THREE.LatheGeometry(capProfile, 48));
  const capMesh = new THREE.Mesh(capGeo, accentMat);
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  capGroup.add(capMesh);

  // Micro knurling rings on cap
  for (let i = 0; i < 4; i++) {
    const ringGeo = trackGeo(new THREE.TorusGeometry(0.152, 0.004, 10, 40));
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, tungstenMat);
    ring.position.y = 2.52 + i * 0.028;
    capGroup.add(ring);
  }

  // Invisible slightly wider hit cylinder for effortless cap clicking
  const capHitGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.72, 16));
  const capHitMat = new THREE.MeshBasicMaterial({ visible: false });
  const capHitMesh = new THREE.Mesh(capHitGeo, capHitMat);
  capHitMesh.position.y = 2.42;
  capHitMesh.name = 'cap_hit_proxy';
  capGroup.add(capHitMesh);

  // ------------------------------------------------------------------
  // PART 02: Dual-Stage Ratchet (双段棘轮)
  // ------------------------------------------------------------------
  const ratchetGroup = new THREE.Group();
  ratchetGroup.name = 'ratchet';

  // Ratchet cylindrical cam body
  const camProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 2.02),
    new THREE.Vector2(0.105, 2.02),
    new THREE.Vector2(0.115, 1.96),
    new THREE.Vector2(0.115, 1.72),
    new THREE.Vector2(0.085, 1.70),
    new THREE.Vector2(0.085, 1.58),
    new THREE.Vector2(0.0, 1.58),
  ];
  const camGeo = trackGeo(new THREE.LatheGeometry(camProfile, 36));
  const camMesh = new THREE.Mesh(camGeo, steelMat);
  camMesh.castShadow = true;
  ratchetGroup.add(camMesh);

  // Extruded star ratchet gear teeth collar
  const gearShape = new THREE.Shape();
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.132 : 0.102;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) gearShape.moveTo(x, y);
    else gearShape.lineTo(x, y);
  }
  gearShape.closePath();
  const gearGeo = trackGeo(
    new THREE.ExtrudeGeometry(gearShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.008,
      bevelSegments: 2,
    }),
  );
  gearGeo.rotateX(Math.PI / 2);
  const gearMesh = new THREE.Mesh(gearGeo, tungstenMat);
  gearMesh.position.y = 1.92;
  ratchetGroup.add(gearMesh);

  // Precision helical spring
  const springGeo = trackGeo(
    new THREE.TubeGeometry(new HelixCurve(0.078, 0.34, 6.5), 72, 0.011, 8, false),
  );
  const springMesh = new THREE.Mesh(springGeo, steelMat);
  springMesh.position.y = 1.44;
  ratchetGroup.add(springMesh);

  // ------------------------------------------------------------------
  // PART 03: Ti-6Al-4V Clip (钛合金笔夹 - 12° chamfer + engraving plate)
  // ------------------------------------------------------------------
  const clipGroup = new THREE.Group();
  clipGroup.name = 'clip';

  // Side profile of the milled elastic clip in XY plane
  const clipShape = new THREE.Shape();
  clipShape.moveTo(0.15, 2.22); // mounting collar anchor inside cap recess
  clipShape.lineTo(0.245, 2.22);
  clipShape.lineTo(0.275, 2.14); // 12° chamfer corner
  clipShape.lineTo(0.275, 1.02); // clip spine
  clipShape.lineTo(0.242, 0.88); // tapered lower beak
  clipShape.lineTo(0.198, 0.89); // ball-free smooth landing lip
  clipShape.lineTo(0.215, 0.98);
  clipShape.lineTo(0.232, 1.06);
  clipShape.lineTo(0.232, 2.09);
  clipShape.lineTo(0.15, 2.09);
  clipShape.closePath();

  const clipGeo = trackGeo(
    new THREE.ExtrudeGeometry(clipShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.01,
      bevelSegments: 3,
    }),
  );
  // Center extrusion in Z
  clipGeo.translate(0, 0, -0.055);
  const clipMesh = new THREE.Mesh(clipGeo, accentMat);
  clipMesh.castShadow = true;
  clipMesh.receiveShadow = true;
  clipGroup.add(clipMesh);

  // Recessed solid clip collar ring that locks under cap
  const clipCollarProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.16, 2.22),
    new THREE.Vector2(0.197, 2.22),
    new THREE.Vector2(0.197, 2.09),
    new THREE.Vector2(0.16, 2.09),
    new THREE.Vector2(0.16, 2.22),
  ];
  const clipCollarGeo = trackGeo(new THREE.LatheGeometry(clipCollarProfile, 48));
  const clipCollarMesh = new THREE.Mesh(clipCollarGeo, accentMat);
  clipGroup.add(clipCollarMesh);

  // Flush Laser Engraving Plate along clip outer spine (+X normal, vertical text along Y)
  const plateGeo = trackGeo(new THREE.PlaneGeometry(0.86, 0.085));
  // First rotate -90 deg in Z so width (0.86) runs vertically along Y, then +90 deg in Y so plane faces +X
  plateGeo.rotateZ(-Math.PI / 2);
  plateGeo.rotateY(Math.PI / 2);
  const plateMesh = new THREE.Mesh(plateGeo, engravingMat);
  plateMesh.position.set(0.292, 1.56, 0);
  clipGroup.add(plateMesh);

  // ------------------------------------------------------------------
  // PART 04: Balance Sleeve (内置配重套筒 - C36000 Brass)
  // ------------------------------------------------------------------
  const sleeveGroup = new THREE.Group();
  sleeveGroup.name = 'sleeve';
  const sleeveProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.085, 1.25),
    new THREE.Vector2(0.148, 1.25),
    new THREE.Vector2(0.154, 1.18),
    new THREE.Vector2(0.154, 0.72),
    new THREE.Vector2(0.145, 0.70), // weight distribution groove
    new THREE.Vector2(0.154, 0.68),
    new THREE.Vector2(0.154, 0.12),
    new THREE.Vector2(0.145, 0.10),
    new THREE.Vector2(0.154, 0.08),
    new THREE.Vector2(0.154, -0.35),
    new THREE.Vector2(0.125, -0.42), // tapered forward balance mass
    new THREE.Vector2(0.085, -0.42),
    new THREE.Vector2(0.085, 1.25),
  ];
  const sleeveGeo = trackGeo(new THREE.LatheGeometry(sleeveProfile, 48));
  const sleeveMesh = new THREE.Mesh(sleeveGeo, brassSleeveMat);
  sleeveMesh.castShadow = true;
  sleeveGroup.add(sleeveMesh);

  // ------------------------------------------------------------------
  // PART 05: Monobloc Barrel (主笔管 - Ti-6Al-4V with 18 micro-grooves)
  // ------------------------------------------------------------------
  const barrelGroup = new THREE.Group();
  barrelGroup.name = 'barrel';

  const barrelProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.16, 2.25), // top inner bore
    new THREE.Vector2(0.188, 2.25),
    new THREE.Vector2(0.196, 2.22), // top chamfer
    new THREE.Vector2(0.196, -0.42), // upper smooth grip section
  ];

  // 18 CNC precision grip micro-grooves from -0.45 down to -1.35
  const grooveCount = 18;
  const grooveStart = -0.45;
  const grooveStep = 0.048;
  for (let i = 0; i < grooveCount; i++) {
    const gy = grooveStart - i * grooveStep;
    barrelProfile.push(new THREE.Vector2(0.196, gy));
    barrelProfile.push(new THREE.Vector2(0.186, gy - 0.012));
    barrelProfile.push(new THREE.Vector2(0.186, gy - 0.026));
    barrelProfile.push(new THREE.Vector2(0.196, gy - 0.036));
  }

  barrelProfile.push(
    new THREE.Vector2(0.196, -1.52),
    new THREE.Vector2(0.184, -1.58), // lower joint step
    new THREE.Vector2(0.16, -1.58),
    new THREE.Vector2(0.16, 2.25),
  );

  const barrelGeo = trackGeo(new THREE.LatheGeometry(barrelProfile, 56));
  const barrelMesh = new THREE.Mesh(barrelGeo, bodyMat);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  barrelGroup.add(barrelMesh);

  // Subtle top accent ring
  const topBandGeo = trackGeo(new THREE.TorusGeometry(0.197, 0.0045, 10, 48));
  topBandGeo.rotateX(Math.PI / 2);
  const topBand = new THREE.Mesh(topBandGeo, tungstenMat);
  topBand.position.y = 2.09;
  barrelGroup.add(topBand);

  // ------------------------------------------------------------------
  // PART 06: Custom High-Capacity Refill (定制大容量笔芯)
  // ------------------------------------------------------------------
  const refillGroup = new THREE.Group();
  refillGroup.name = 'refill';

  const refillTubeProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 1.38),
    new THREE.Vector2(0.068, 1.38),
    new THREE.Vector2(0.068, -1.55),
    new THREE.Vector2(0.042, -1.62), // front taper
    new THREE.Vector2(0.042, -2.02),
    new THREE.Vector2(0.018, -2.18), // needle step
    new THREE.Vector2(0.014, -2.42), // 0.38mm tungsten needle tip
    new THREE.Vector2(0.0, -2.44),
  ];
  const refillGeo = trackGeo(new THREE.LatheGeometry(refillTubeProfile, 36));
  const refillMesh = new THREE.Mesh(refillGeo, steelMat);
  refillMesh.castShadow = true;
  refillGroup.add(refillMesh);

  // Crimson ink-grade identification ring
  const sealGeo = trackGeo(new THREE.CylinderGeometry(0.071, 0.071, 0.14, 32));
  const sealMesh = new THREE.Mesh(sealGeo, sealMat);
  sealMesh.position.y = 0.85;
  refillGroup.add(sealMesh);

  // Micro tungsten carbide rollerball at tip
  const ballGeo = trackGeo(new THREE.SphereGeometry(0.016, 16, 16));
  const ballMesh = new THREE.Mesh(ballGeo, tungstenMat);
  ballMesh.position.y = -2.44;
  refillGroup.add(ballMesh);

  // ------------------------------------------------------------------
  // PART 07: 0.38mm Zero-Play Nose Cone (0.38mm 碳化钨笔尖锁止锥套)
  // ------------------------------------------------------------------
  const tipGroup = new THREE.Group();
  tipGroup.name = 'tip';

  const tipConeProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.048, -1.55), // inner zero-play collet throat
    new THREE.Vector2(0.175, -1.55),
    new THREE.Vector2(0.195, -1.58), // seamless barrel flush step
    new THREE.Vector2(0.184, -1.85),
    new THREE.Vector2(0.125, -2.18), // parabolic grip taper
    new THREE.Vector2(0.056, -2.42),
    new THREE.Vector2(0.042, -2.46), // micro chamfer lip
    new THREE.Vector2(0.022, -2.46), // +/-0.02mm tolerance orifice
    new THREE.Vector2(0.022, -2.05),
    new THREE.Vector2(0.048, -1.85),
    new THREE.Vector2(0.048, -1.55),
  ];
  const tipGeo = trackGeo(new THREE.LatheGeometry(tipConeProfile, 56));
  const tipMesh = new THREE.Mesh(tipGeo, bodyMat);
  tipMesh.castShadow = true;
  tipMesh.receiveShadow = true;
  tipGroup.add(tipMesh);

  // Zero-play internal tungsten collet collar
  const colletGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.032, 0.22, 32));
  const colletMesh = new THREE.Mesh(colletGeo, tungstenMat);
  colletMesh.position.y = -2.31;
  tipGroup.add(colletMesh);

  // Assemble all 7 groups into root
  const parts: Record<PartId, THREE.Group> = {
    cap: capGroup,
    ratchet: ratchetGroup,
    clip: clipGroup,
    sleeve: sleeveGroup,
    barrel: barrelGroup,
    refill: refillGroup,
    tip: tipGroup,
  };

  for (const key of Object.keys(parts) as PartId[]) {
    root.add(parts[key]);
  }

  // Local part anchor coordinates (for 2D engineering leader line projections)
  const partAnchors: Record<PartId, THREE.Vector3> = {
    cap: new THREE.Vector3(0, 2.52, 0),
    ratchet: new THREE.Vector3(0, 1.84, 0),
    clip: new THREE.Vector3(0.27, 1.48, 0),
    sleeve: new THREE.Vector3(0, 0.45, 0),
    barrel: new THREE.Vector3(-0.19, -0.55, 0),
    refill: new THREE.Vector3(0, -0.95, 0),
    tip: new THREE.Vector3(0, -2.28, 0),
  };

  let currentExplosion = 0;
  let currentClickTravel = 0;
  let currentTipExtension = 0;

  const updateTransforms = () => {
    const offsets = computeExplodedOffsets(currentExplosion);
    for (const id of Object.keys(parts) as PartId[]) {
      const off = offsets[id];
      let extraY = 0;
      if (id === 'cap') {
        extraY = -currentClickTravel;
      } else if (id === 'refill') {
        extraY = -currentTipExtension;
      }
      parts[id].position.set(off.radialX, off.axial + extraY, off.radialZ);
    }
  };

  const applyMaterial = (materialId: MaterialId) => {
    const spec = PEN_MATERIALS[materialId];
    const tex = textureSets[spec.pbr.surfaceTexture];

    bodyMat.color.setHex(spec.pbr.colorHex);
    bodyMat.metalness = spec.pbr.metalness;
    bodyMat.roughness = spec.pbr.roughness;
    bodyMat.anisotropy = spec.pbr.anisotropy;
    bodyMat.clearcoat = spec.pbr.clearcoat;
    bodyMat.clearcoatRoughness = spec.pbr.clearcoatRoughness;
    bodyMat.roughnessMap = tex.roughnessMap;
    bodyMat.bumpMap = tex.bumpMap;
    bodyMat.needsUpdate = true;

    accentMat.color.setHex(spec.pbr.accentHex);
    accentMat.metalness = Math.min(0.98, spec.pbr.metalness + 0.04);
    accentMat.roughness = Math.max(0.14, spec.pbr.roughness - 0.1);
    accentMat.anisotropy = Math.max(0.4, spec.pbr.anisotropy);
    accentMat.needsUpdate = true;
  };

  const updateEngraving = (text: string, materialId: MaterialId) => {
    const nextTex = createEngravingPlateTexture(text, materialId, maxAnisotropy);
    engravingMat.map = nextTex;
    engravingMat.needsUpdate = true;
    engravingTex.dispose();
    engravingTex = nextTex;
  };

  const setExplosionProgress = (progress: number) => {
    currentExplosion = Math.max(0, Math.min(1, progress));
    updateTransforms();
  };

  const setClickerExtension = (clickTravel: number, tipExtendedAmount: number) => {
    currentClickTravel = clickTravel;
    currentTipExtension = tipExtendedAmount;
    updateTransforms();
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    bodyMat.dispose();
    accentMat.dispose();
    brassSleeveMat.dispose();
    steelMat.dispose();
    tungstenMat.dispose();
    sealMat.dispose();
    engravingMat.dispose();
    capHitMat.dispose();
    engravingTex.dispose();
    Object.values(textureSets).forEach((s) => {
      s.roughnessMap.dispose();
      s.bumpMap.dispose();
    });
  };

  updateTransforms();

  return {
    root,
    parts,
    partAnchors,
    capHitMesh,
    applyMaterial,
    updateEngraving,
    setExplosionProgress,
    setClickerExtension,
    dispose,
  };
}
