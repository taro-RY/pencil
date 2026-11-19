import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw, Sparkles } from 'lucide-react';
import {
  EXPLODED_PARTS,
  HERO_PEN_SCALE,
  MaterialId,
  PEN_MATERIALS,
  PartId,
  computeHeroPenScale,
} from '../utils/penConfig';
import { PenAssemblyHandle, buildPenAssembly } from '../three/penGeometry';
import { createAbyssalField } from '../three/abyssalField';
import { SpringGarden3DHandle, createSpringGarden3D } from '../three/springGarden3d';
import { createStudioRig } from '../three/studioSetup';
import { LivingBranchCanvas } from './LivingBranchCanvas';

interface HeroExplodedStageProps {
  materialId: MaterialId;
  engravingText: string;
}

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

const _projVec = new THREE.Vector3();

const INITIAL_ANCHORS: Record<PartId, ProjectedPoint> = {
  cap: { x: 0, y: 0, visible: false },
  ratchet: { x: 0, y: 0, visible: false },
  clip: { x: 0, y: 0, visible: false },
  sleeve: { x: 0, y: 0, visible: false },
  barrel: { x: 0, y: 0, visible: false },
  refill: { x: 0, y: 0, visible: false },
  tip: { x: 0, y: 0, visible: false },
};

const PART_INSPECT_ANGLES: Record<PartId, number> = {
  cap: -0.25,
  ratchet: 0.45,
  clip: 0.15,
  sleeve: -0.65,
  barrel: 0.35,
  refill: 0.72,
  tip: -0.18,
};

export const HeroExplodedStage: React.FC<HeroExplodedStageProps> = ({
  materialId,
  engravingText,
}) => {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  const [webglReady, setWebglReady] = useState(true);
  const [heroFade, setHeroFade] = useState(1);
  const [explosionUi, setExplosionUi] = useState(0);
  const [orbitDegUi, setOrbitDegUi] = useState(0);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartId>('ratchet');
  const [partAngleBias, setPartAngleBias] = useState(0);
  const [anchors, setAnchors] = useState<Record<PartId, ProjectedPoint>>(INITIAL_ANCHORS);
  const [viewportSize, setViewportSize] = useState({ width: 1440, height: 900 });

  // Living botanical branch controls (ephemeral hover/dwell by default, optional hold-bloom toggle)
  const [bloomRatio, setBloomRatio] = useState(0);
  const [persistBloom, setPersistBloom] = useState(false);
  const [resetCommandId, setResetCommandId] = useState(0);

  const penRef = useRef<PenAssemblyHandle | null>(null);
  const springGardenRef = useRef<SpringGarden3DHandle | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const targetExplosionRef = useRef(0);
  const targetScrollBlendRef = useRef(0);
  const targetOrbitAngleRef = useRef(0);
  const pointerParallaxRef = useRef({ x: 0, y: 0 });
  const pointerDwellRef = useRef({ wx: 0, wy: 0, active: false, lastMoveMs: 0 });
  const persistBloomRef = useRef(false);
  const resetCamFnRef = useRef<(() => void) | null>(null);
  const manualOverrideRef = useRef<number | null>(null);
  const isStageVisibleRef = useRef(true);

  useEffect(() => {
    persistBloomRef.current = persistBloom;
    requestRenderRef.current?.();
  }, [persistBloom]);

  useEffect(() => {
    if (resetCommandId > 0) {
      springGardenRef.current?.resetDormant();
      setBloomRatio(0);
      requestRenderRef.current?.();
    }
  }, [resetCommandId]);

  useEffect(() => {
    manualOverrideRef.current = manualOverride;
    if (manualOverride !== null) {
      targetExplosionRef.current = manualOverride;
      targetScrollBlendRef.current = manualOverride > 0.05 ? 1 : 0;
      targetOrbitAngleRef.current = manualOverride * Math.PI * 0.75 + partAngleBias;
      setExplosionUi(manualOverride);
      setOrbitDegUi(Math.round(manualOverride * 135));
      requestRenderRef.current?.();
    }
  }, [manualOverride, partAngleBias]);

  // Sync material changes without remounting WebGL
  useEffect(() => {
    if (penRef.current) {
      penRef.current.applyMaterial(materialId);
      penRef.current.updateEngraving(engravingText, materialId);
      requestRenderRef.current?.();
    }
  }, [materialId, engravingText]);

  // Initialize Three.js Studio + Abyssal Field Scene once
  useEffect(() => {
    const mount = canvasMountRef.current;
    const stageEl = stageContainerRef.current;
    if (!mount || !stageEl) return;

    let rig: ReturnType<typeof createStudioRig>;
    try {
      rig = createStudioRig(mount, 33, true); // transparent background so LivingBranchCanvas shows behind pen
    } catch {
      setWebglReady(false);
      return;
    }

    const { scene, renderer, camera, isSoftwareGl } = rig;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const pen = buildPenAssembly(materialId, maxAnisotropy, engravingText);
    penRef.current = pen;

    const penPivot = new THREE.Group();
    penPivot.add(pen.root);
    penPivot.rotation.set(0.18, -0.35, -0.58);
    penPivot.position.set(0, 0.05, 0);
    penPivot.scale.setScalar(HERO_PEN_SCALE);
    scene.add(penPivot);

    // Abyssal underwater caustic & mineral-mote orbital field (Act II)
    const abyssalField = createAbyssalField();
    abyssalField.update(0, 0);
    scene.add(abyssalField.group);

    // 3D Multi-Species Micro-Spring Garden (Act I background layer behind pen)
    const springGarden = createSpringGarden3D();
    springGardenRef.current = springGarden;
    scene.add(springGarden.group);
    pen.root.renderOrder = 2;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const botanicalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.75);
    const worldHit = new THREE.Vector3();

    camera.position.set(0, 0, 10.6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Never hijack page scroll
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enabled = false; // Locked in Hero Act I so branches remain fixed; unlocked in Act II
    controls.autoRotate = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.72;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.84;

    const heroPenSpinRef = { dragging: false, lastX: 0, yaw: 0 };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let currentExplosion = 0;
    let currentBlend = 0;
    let currentOrbitAngle = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let lastAnchorUpdate = 0;
    let lastReportedBloom = -1;
    let isDisposed = false;

    const updateScreenAnchors = (force = false) => {
      const now = performance.now();
      if (!force && now - lastAnchorUpdate < 45) return;
      lastAnchorUpdate = now;

      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width <= 0 || height <= 0) return;

      penPivot.updateMatrixWorld(true);
      const next: Record<PartId, ProjectedPoint> = { ...INITIAL_ANCHORS };
      for (const part of EXPLODED_PARTS) {
        const partGroup = pen.parts[part.id];
        _projVec.copy(pen.partAnchors[part.id]);
        partGroup.localToWorld(_projVec);
        _projVec.project(camera);
        next[part.id] = {
          x: ((_projVec.x + 1) * 0.5) * width,
          y: ((-_projVec.y + 1) * 0.5) * height,
          visible: _projVec.z < 1 && _projVec.z > -1,
        };
      }
      setAnchors(next);
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (isDisposed || !isStageVisibleRef.current) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (isDisposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        const targetExp = targetExplosionRef.current;
        const targetBlend = targetScrollBlendRef.current;
        const targetOrbit = targetOrbitAngleRef.current;

        const prevExp = currentExplosion;
        const prevBlend = currentBlend;
        const prevOrbit = currentOrbitAngle;

        if (isSoftwareGl) {
          currentExplosion = targetExp;
          currentBlend = targetBlend;
          currentOrbitAngle = targetOrbit;
          currentParallaxX = pointerParallaxRef.current.x;
          currentParallaxY = pointerParallaxRef.current.y;
        } else {
          currentExplosion = THREE.MathUtils.damp(currentExplosion, targetExp, 9, dt);
          currentBlend = THREE.MathUtils.damp(currentBlend, targetBlend, 7, dt);
          currentOrbitAngle = THREE.MathUtils.damp(currentOrbitAngle, targetOrbit, 6, dt);
          currentParallaxX = THREE.MathUtils.damp(
            currentParallaxX,
            pointerParallaxRef.current.x,
            6,
            dt,
          );
          currentParallaxY = THREE.MathUtils.damp(
            currentParallaxY,
            pointerParallaxRef.current.y,
            6,
            dt,
          );
        }

        pen.setExplosionProgress(currentExplosion);

        const nowSec = now / 1000;
        // 3D Micro-Spring Garden updates & fades cleanly before Exploded View
        const gardenVisibleAlpha = Math.max(0, 1 - currentBlend * 1.45);
        springGarden.setVisibilityAlpha(gardenVisibleAlpha);

        let springActive = false;
        if (gardenVisibleAlpha > 0.02) {
          const dwell = pointerDwellRef.current;
          if (
            dwell.active &&
            !persistBloomRef.current &&
            now - dwell.lastMoveMs < 4200
          ) {
            springGarden.awakenAtWorld(dwell.wx, dwell.wy, 0.46, nowSec, dt * 1.25);
          }
          if (isSoftwareGl) {
            if (persistBloomRef.current) {
              for (let s = 0; s < 5; s++) {
                springGarden.step(0.3, nowSec, true);
              }
            } else {
              springGarden.step(0.25, nowSec, false);
            }
          } else {
            springActive = springGarden.step(dt, nowSec, persistBloomRef.current);
          }
          const nextBloomRatio = springGarden.getBloomRatio();
          if (Math.abs(nextBloomRatio - lastReportedBloom) > 0.03) {
            lastReportedBloom = nextBloomRatio;
            setBloomRatio(nextBloomRatio);
          }
        }

        // Abyssal field fades in smoothly as user dives into Exploded Act II
        const abyssalAlpha = Math.max(0, Math.min(1, (currentBlend - 0.15) / 0.85));
        abyssalField.update(nowSec, abyssalAlpha);

        const isNarrow = mount.clientWidth < 768;
        const heroRotZ = isNarrow ? -0.45 : -0.64;
        const explodedRotZ = -0.04;
        const baseRotZ = THREE.MathUtils.lerp(heroRotZ, explodedRotZ, currentBlend);
        // Subtle Abyssal orbital yaw sweep combined with Hero angle
        const baseRotY = THREE.MathUtils.lerp(-0.35, -0.2 + currentOrbitAngle * 0.45, currentBlend);
        const baseRotX = THREE.MathUtils.lerp(0.18, 0.08, currentBlend);

        const heroY = isNarrow ? 0.34 : 0.04;
        const explodedY = 0.0;
        penPivot.position.y = THREE.MathUtils.lerp(heroY, explodedY, currentBlend);
        penPivot.scale.setScalar(computeHeroPenScale(currentBlend));

        const parallaxWeight = 1 - currentBlend * 0.75;
        const heroSpinWeight = Math.max(0, 1 - currentBlend * 2);
        penPivot.rotation.set(
          baseRotX + currentParallaxY * 0.09 * parallaxWeight,
          baseRotY + currentParallaxX * 0.14 * parallaxWeight + heroPenSpinRef.yaw * heroSpinWeight,
          baseRotZ,
        );

        const heroCamZ = isNarrow ? 15.8 : 10.4;
        const explodedCamZ = isNarrow ? 19.8 : 17.6;
        const desiredZ = THREE.MathUtils.lerp(heroCamZ, explodedCamZ, currentExplosion);

        // Lock camera & OrbitControls in Hero Act I so 3D branches NEVER slide or drift
        const allowOrbit = currentBlend >= 0.18;
        if (controls.enabled !== allowOrbit) {
          controls.enabled = allowOrbit;
        }
        if (!allowOrbit) {
          camera.position.set(0, 0, desiredZ);
          camera.lookAt(0, 0, 0);
          camera.updateMatrixWorld();
        } else {
          const dir = camera.position.clone().normalize();
          if (dir.lengthSq() > 0.001) {
            const currentDist = camera.position.length();
            const nextDist = isSoftwareGl
              ? desiredZ
              : THREE.MathUtils.damp(currentDist, desiredZ, 7, dt);
            camera.position.copy(dir.multiplyScalar(nextDist));
          }
        }

        const controlsChanged = allowOrbit ? controls.update() : false;
        renderer.render(scene, camera);

        if (currentExplosion > 0.08) {
          updateScreenAnchors(
            Math.abs(currentExplosion - prevExp) < 0.002 &&
              Math.abs(currentOrbitAngle - prevOrbit) < 0.002,
          );
        }

        const keepDwellLoop =
          pointerDwellRef.current.active &&
          now - pointerDwellRef.current.lastMoveMs < 1800 &&
          gardenVisibleAlpha > 0.02 &&
          !persistBloomRef.current;

        const settling =
          !isSoftwareGl &&
          (Math.abs(currentExplosion - targetExp) > 0.001 ||
            Math.abs(currentBlend - targetBlend) > 0.001 ||
            Math.abs(currentOrbitAngle - targetOrbit) > 0.001 ||
            Math.abs(currentExplosion - prevExp) > 0.0002 ||
            Math.abs(currentBlend - prevBlend) > 0.0002 ||
            Math.abs(currentParallaxX - pointerParallaxRef.current.x) > 0.001 ||
            Math.abs(currentParallaxY - pointerParallaxRef.current.y) > 0.001 ||
            controlsChanged ||
            springActive ||
            keepDwellLoop ||
            abyssalAlpha > 0.05);

        const done = () => {
          renderBusy = false;
          if (renderDirty || settling) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    requestRenderRef.current = requestRender;

    resetCamFnRef.current = () => {
      const isNarrow = mount.clientWidth < 768;
      const heroCamZ = isNarrow ? 15.8 : 10.4;
      const explodedCamZ = isNarrow ? 19.8 : 17.6;
      camera.position.set(
        0,
        0,
        THREE.MathUtils.lerp(heroCamZ, explodedCamZ, targetExplosionRef.current),
      );
      controls.target.set(0, 0, 0);
      controls.update();
      requestRender();
    };

    const onControlsChange = () => requestRender();
    controls.addEventListener('change', onControlsChange);

    const updateFromScroll = () => {
      const rect = stageEl.getBoundingClientRect();
      const totalScrollable = Math.max(1, stageEl.offsetHeight - window.innerHeight);
      const scrolled = Math.max(0, -rect.top);
      const norm = Math.max(0, Math.min(1, scrolled / totalScrollable));

      // Finish fading Hero cleanly BEFORE exploded overlay begins (zero overlap)
      const fade = Math.max(0, Math.min(1, 1 - norm / 0.14));
      setHeroFade(fade);

      if (manualOverrideRef.current === null) {
        const exp = Math.max(0, Math.min(1, (norm - 0.18) / 0.7));
        targetExplosionRef.current = exp;
        targetScrollBlendRef.current = Math.max(0, Math.min(1, (norm - 0.08) / 0.22));
        targetOrbitAngleRef.current = exp * Math.PI * 0.75;
        setExplosionUi(exp);
        setOrbitDegUi(Math.round(exp * 135));
        requestRender();
      }
    };

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (targetScrollBlendRef.current < 0.25) {
        const rect = mount.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        if (Math.abs(ndcX) < 0.34) {
          heroPenSpinRef.dragging = true;
          heroPenSpinRef.lastX = e.clientX;
        }
      }
    };

    const onCanvasPointerUp = () => {
      heroPenSpinRef.dragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (heroPenSpinRef.dragging && targetScrollBlendRef.current < 0.25) {
        const dx = e.clientX - heroPenSpinRef.lastX;
        heroPenSpinRef.lastX = e.clientX;
        heroPenSpinRef.yaw += dx * 0.01;
        requestRender();
      }
      if (targetScrollBlendRef.current > 0.35) {
        pointerDwellRef.current.active = false;
        return;
      }
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointerParallaxRef.current = { x: nx, y: ny };

      const rect = mount.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(botanicalPlane, worldHit)) {
          const nowMs = performance.now();
          if (!renderBusy) {
            lastTime = nowMs - 16;
          }
          pointerDwellRef.current = {
            wx: worldHit.x,
            wy: worldHit.y,
            active: true,
            lastMoveMs: nowMs,
          };
          springGarden.awakenAtWorld(worldHit.x, worldHit.y, 0.46, nowMs / 1000, 0.35);
          if (isSoftwareGl) {
            springGarden.step(0.32, nowMs / 1000, persistBloomRef.current);
          }
        }
      } else {
        pointerDwellRef.current.active = false;
      }

      requestRender();
    };

    const onResize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      setViewportSize({ width: w, height: h });
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        isStageVisibleRef.current = visible;
        if (visible) requestRender();
      },
      { threshold: 0.02 },
    );
    observer.observe(stageEl);

    setViewportSize({
      width: Math.max(1, mount.clientWidth),
      height: Math.max(1, mount.clientHeight),
    });

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
    };

    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    window.addEventListener('pointerup', onCanvasPointerUp);
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);

    updateFromScroll();
    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer.disconnect();
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
      window.removeEventListener('pointerup', onCanvasPointerUp);
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      springGarden.dispose();
      abyssalField.dispose();
      pen.dispose();
      rig.dispose();
    };
  }, []);

  const showExplodedOverlay = explosionUi > 0.18;
  const effectiveHeroFade =
    showExplodedOverlay || (manualOverride !== null && manualOverride > 0.05) ? 0 : heroFade;
  const abyssalIntensity = Math.max(0, Math.min(1, (explosionUi - 0.1) / 0.5));
  const activeMaterial = PEN_MATERIALS[materialId];
  const leftParts = EXPLODED_PARTS.filter((p) => p.calloutSide === 'left');
  const rightParts = EXPLODED_PARTS.filter((p) => p.calloutSide === 'right');

  const handleSelectPart = (partId: PartId) => {
    setSelectedPart(partId);
    const bias = PART_INSPECT_ANGLES[partId];
    setPartAngleBias(bias);
    if (explosionUi < 0.75) {
      setManualOverride(0.95);
    } else {
      targetOrbitAngleRef.current = explosionUi * Math.PI * 0.75 + bias;
      requestRenderRef.current?.();
    }
  };

  return (
    <section
      id="top"
      ref={stageContainerRef}
      className="relative z-10 h-[300vh] w-full bg-transparent"
      data-testid="hero-exploded-stage"
      data-explosion={explosionUi.toFixed(2)}
      data-bloom-ratio={bloomRatio.toFixed(2)}
    >
      {/* Anchor for #structure right where exploded phase begins */}
      <div id="structure" className="absolute top-[115vh] h-px w-px" aria-hidden="true" />

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Bright atmospheric mist scrim for Act II Exploded View */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(ellipse 72% 66% at 50% 48%, rgba(250, 249, 246, 0.64) 0%, rgba(232, 242, 244, 0.72) 60%, rgba(220, 234, 238, 0.80) 100%)',
            opacity: abyssalIntensity,
          }}
          aria-hidden="true"
        />

        {/* Gentle luminous bottom mist veil in Hero so dark ink typography stays >= 4.5:1 over any bright sky */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(250,248,244,0.68) 0%, rgba(250,248,244,0.22) 26%, rgba(250,248,244,0) 56%)',
            opacity: effectiveHeroFade,
          }}
          aria-hidden="true"
        />

        {/* ACT I: 0.38mm Ink Calligraphy Pointer Ribbon */}
        <LivingBranchCanvas visibleAlpha={effectiveHeroFade} />

        {/* Isolated 3D Canvas Container */}
        <div
          ref={canvasMountRef}
          className={`absolute inset-0 z-10 ${
            showExplodedOverlay ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          data-testid="hero-3d-canvas"
          aria-label="M-01 钛金属精密签字笔 3D 交互视口"
        />

        {/* Graceful Fallback if WebGL unavailable */}
        {!webglReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FAF8F4]/90 text-center px-6">
            <div className="max-w-md border border-[#141619]/15 bg-white p-8">
              <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
                M-01 · TI-6AL-4V
              </p>
              <p className="mt-3 text-sm text-[#4C525C]">
                当前浏览器环境未启用 WebGL 3D 渲染，您仍可完整体验下方手感实验室、规格剖面与刻字定制。
              </p>
            </div>
          </div>
        )}

        {/* HERO OVERLAY (strictly hidden when Act II Exploded Overlay is active) */}
        <div
          className={`pointer-events-none absolute inset-0 z-20 mx-auto flex max-w-[1280px] flex-col justify-between px-6 pt-24 pb-10 md:px-10 md:pb-14 transition-opacity duration-200 ${
            effectiveHeroFade < 0.04 ? 'invisible' : 'visible'
          }`}
          style={{ opacity: effectiveHeroFade }}
          aria-hidden={effectiveHeroFade < 0.04}
        >
          {/* Top-left poetic specimen prompt + ephemeral vs persistent bloom toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 border border-[#141619]/10 bg-[#FAF8F4]/72 px-3 py-1.5 backdrop-blur-md text-xs tracking-wider text-[#2E343D]">
              <span className="font-mono-tech font-medium text-[#141619]">M-01</span>
              <span aria-hidden="true">·</span>
              <span className="hidden sm:inline">划过或停驻固定枯枝，繁花新芽随锋而生</span>
              <span className="sm:hidden">划过枯枝生 3D 春意</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tech tabular-nums font-medium text-[#9C6226]">
                生境 {Math.round(bloomRatio * 100)}%
              </span>
            </div>

            <div
              className={`flex items-center gap-2 ${
                effectiveHeroFade < 0.04 ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            >
              {!persistBloom ? (
                <button
                  type="button"
                  data-testid="awaken-bloom-btn"
                  onClick={() => setPersistBloom(true)}
                  className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-[#FAF8F4]/80 px-3 py-1.5 text-xs font-medium text-[#141619] backdrop-blur-md transition-colors hover:border-[#9C6226] hover:bg-[#9C6226] hover:text-[#FAF8F4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#9C6226]" />
                  <span>驻留满园春色</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPersistBloom(false);
                    setResetCommandId((c) => c + 1);
                  }}
                  className="inline-flex items-center gap-1.5 border border-[#141619]/20 bg-[#FAF8F4]/85 px-3 py-1.5 text-xs font-medium text-[#141619] backdrop-blur-md transition-colors hover:border-[#9C6226] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>恢复随影生灭</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom split: Left poetic editorial headline / Right pricing & dive link */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h1
                className="font-editorial text-[clamp(2.25rem,4.2vw,3.85rem)] font-medium leading-[1.12] tracking-tight text-[#141619]"
                style={{ textWrap: 'balance' }}
              >
                克制的重量，落笔的安静。
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-[#3A4048] font-mono-tech tabular-nums">
                <span>0.02mm 零虚位锁止</span>
                <span aria-hidden="true">·</span>
                <span>28.4g 黄金配重</span>
                <span aria-hidden="true">·</span>
                <span>120,000 次全金属棘轮</span>
              </p>
            </div>

            <div
              className={`flex flex-col items-start md:items-end text-left md:text-right ${
                effectiveHeroFade < 0.04 ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            >
              <div className="font-mono-tech text-2xl md:text-3xl font-medium tracking-tight text-[#141619] tabular-nums">
                ¥ {activeMaterial.priceCny.toLocaleString('zh-CN')}{' '}
                <span className="text-sm font-normal text-[#4C525C]">起</span>
              </div>
              <p className="mt-1 text-xs text-[#4C525C]">
                {activeMaterial.name} · Ti-6Al-4V 航空五级钛合金
              </p>
              <a
                href="#structure"
                className="mt-4 inline-flex items-center gap-2 border-b border-[#141619]/30 pb-1 text-xs font-medium tracking-wider text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226]"
              >
                向下步入立体解构，检视七件精密组件 ↓
              </a>
            </div>
          </div>
        </div>

        {/* ACT II: ORBITAL EXPLODED VIEW OVERLAY */}
        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
            showExplodedOverlay ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
          aria-hidden={!showExplodedOverlay}
        >
          {/* SVG Engineering Leader Lines (Desktop) */}
          <svg
            className="hidden md:block absolute inset-0 h-full w-full"
            viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
            preserveAspectRatio="none"
          >
            {EXPLODED_PARTS.map((part) => {
              const pt = anchors[part.id];
              if (!pt || !pt.visible) return null;
              const isLeft = part.calloutSide === 'left';
              const listIdx = isLeft
                ? leftParts.findIndex((p) => p.id === part.id)
                : rightParts.findIndex((p) => p.id === part.id);
              const totalInCol = isLeft ? leftParts.length : rightParts.length;
              const vw = viewportSize.width;
              const vh = viewportSize.height;
              const targetY = vh * (0.24 + (listIdx / Math.max(1, totalInCol - 1)) * 0.48);
              const targetX = isLeft ? Math.min(340, vw * 0.25) : Math.max(vw - 340, vw * 0.75);
              const elbowX = isLeft ? pt.x - 42 : pt.x + 42;
              const isSelected = selectedPart === part.id;

              return (
                <g key={part.id}>
                  <polyline
                    points={`${pt.x.toFixed(1)},${pt.y.toFixed(1)} ${elbowX.toFixed(
                      1,
                    )},${targetY.toFixed(1)} ${targetX.toFixed(1)},${targetY.toFixed(1)}`}
                    fill="none"
                    stroke={isSelected ? '#9C6226' : 'rgba(20,22,25,0.28)'}
                    strokeWidth={isSelected ? 1.4 : 0.85}
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 3.5 : 2.3}
                    fill={isSelected ? '#9C6226' : '#141619'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Top Chapter Indicator + Orbital Azimuth */}
          <div className="mx-auto flex max-w-[1280px] items-start justify-between px-6 pt-20 md:px-10">
            <div>
              <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
                01. 回旋透视解构
              </p>
              <h2 className="mt-1 text-lg md:text-2xl font-medium tracking-tight text-[#141619]">
                随滚轮展开七件精密构件，自由拖拽检视角度
              </h2>
            </div>

            <div className="pointer-events-auto flex items-center gap-3">
              <span className="hidden sm:inline font-mono-tech text-xs text-[#4C525C] tabular-nums">
                方位 {String(orbitDegUi).padStart(3, '0')}° · 拆解 {Math.round(explosionUi * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setPartAngleBias(0);
                  resetCamFnRef.current?.();
                }}
                className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-[#FAF8F4]/88 px-3 py-1.5 text-xs font-medium text-[#141619] backdrop-blur-md transition-colors hover:border-[#9C6226] hover:text-[#9C6226] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
                aria-label="重置 3D 视角"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>重置视角</span>
              </button>
            </div>
          </div>

          {/* Desktop Left & Right Engineering Callouts */}
          <div className="hidden md:block">
            <div className="pointer-events-auto absolute left-8 lg:left-12 top-[20%] bottom-[22%] flex w-64 flex-col justify-between">
              {leftParts.map((part) => {
                const active = selectedPart === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part.id)}
                    className={`text-left border-b pb-2.5 transition-colors focus-visible:outline-none ${
                      active
                        ? 'border-[#9C6226] text-[#141619]'
                        : 'border-[#141619]/15 text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[#141619]">
                        <span className="font-mono-tech text-xs text-[#9C6226] mr-2">
                          {part.index}
                        </span>
                        {part.name}
                      </span>
                      <span className="font-mono-tech text-[11px] text-[#4C525C] tabular-nums">
                        {part.metric}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#4C525C]">
                      {part.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-auto absolute right-8 lg:right-12 top-[24%] bottom-[24%] flex w-64 flex-col justify-between">
              {rightParts.map((part) => {
                const active = selectedPart === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part.id)}
                    className={`text-left border-b pb-2.5 transition-colors focus-visible:outline-none ${
                      active
                        ? 'border-[#9C6226] text-[#141619]'
                        : 'border-[#141619]/15 text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[#141619]">
                        <span className="font-mono-tech text-xs text-[#9C6226] mr-2">
                          {part.index}
                        </span>
                        {part.name}
                      </span>
                      <span className="font-mono-tech text-[11px] text-[#4C525C] tabular-nums">
                        {part.metric}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#4C525C]">
                      {part.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Active Part Readout + Bottom Scrubber Bar */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-5 mx-auto flex max-w-[820px] flex-col gap-3 px-4 md:px-6">
            {(() => {
              const part = EXPLODED_PARTS.find((p) => p.id === selectedPart) ?? EXPLODED_PARTS[0];
              return (
                <div className="md:hidden border border-[#141619]/12 bg-[#FAF8F4]/92 backdrop-blur-md p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#141619]">
                      <span className="font-mono-tech text-xs text-[#9C6226] mr-2">
                        {part.index}
                      </span>
                      {part.name}
                    </span>
                    <span className="font-mono-tech text-xs text-[#9C6226] tabular-nums">
                      {part.metric}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#4C525C]">{part.description}</p>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#141619]/12 bg-[#FAF8F4]/90 backdrop-blur-md px-4 py-2.5">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <label
                  htmlFor="explosion-slider"
                  className="font-mono-tech text-xs text-[#4C525C] whitespace-nowrap shrink-0"
                >
                  拆解刻度
                </label>
                <input
                  id="explosion-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(explosionUi * 100)}
                  onChange={(e) => setManualOverride(Number(e.target.value) / 100)}
                  className="h-1 w-full accent-[#9C6226] cursor-pointer"
                  aria-label="手动控制笔身爆炸拆解程度"
                />
                {manualOverride !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualOverride(null);
                      setPartAngleBias(0);
                    }}
                    className="font-mono-tech text-[11px] text-[#9C6226] whitespace-nowrap shrink-0 hover:underline"
                  >
                    恢复随滚轮同步
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                {EXPLODED_PARTS.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part.id)}
                    className={`px-2 py-1 font-mono-tech text-xs transition-colors whitespace-nowrap shrink-0 ${
                      selectedPart === part.id
                        ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                        : 'text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    {part.index}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
