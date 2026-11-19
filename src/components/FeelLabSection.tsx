import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Eraser, Maximize2, Volume2, VolumeX } from 'lucide-react';
import {
  MATERIAL_LIST,
  MaterialId,
  PEN_MATERIALS,
  computeInkWidth,
} from '../utils/penConfig';
import { PenAssemblyHandle, buildPenAssembly } from '../three/penGeometry';
import { createRipplePedestal } from '../three/abyssalField';
import { createStudioRig } from '../three/studioSetup';
import { soundEngine } from '../utils/soundEngine';
import {
  FLOWER_STYLE_LIST,
  FLOWER_STYLE_MAP,
  FlowerStyleId,
  drawBotanicalSprout,
} from '../utils/paperBotanicals';

interface FeelLabSectionProps {
  materialId: MaterialId;
  onSelectMaterial: (id: MaterialId) => void;
  engravingText: string;
  onOpenStudioFullscreen?: () => void;
}

type WritingMode = 'poetic' | 'pure';

export const FeelLabSection: React.FC<FeelLabSectionProps> = ({
  materialId,
  onSelectMaterial,
  engravingText,
  onOpenStudioFullscreen,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const paperCanvasRef = useRef<HTMLCanvasElement>(null);

  const [tipExtended, setTipExtended] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [pulseWaveId, setPulseWaveId] = useState(0);
  const [muted, setMuted] = useState(false);
  const [writingMode, setWritingMode] = useState<WritingMode>('poetic');
  const [flowerStyle, setFlowerStyle] = useState<FlowerStyleId>('blueAster');
  const [inkMetrics, setInkMetrics] = useState({ strokeCount: 0, lastWidthMm: '0.38' });

  const writingModeRef = useRef<WritingMode>('poetic');
  const flowerStyleRef = useRef<FlowerStyleId>('blueAster');
  useEffect(() => {
    writingModeRef.current = writingMode;
  }, [writingMode]);
  useEffect(() => {
    flowerStyleRef.current = flowerStyle;
  }, [flowerStyle]);

  const penRef = useRef<PenAssemblyHandle | null>(null);
  const rippleTriggerRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const tipExtendedRef = useRef(false);
  const clickTriggerTimeRef = useRef(0);
  const isVisibleRef = useRef(true);

  const triggerMechanicalClick = () => {
    const next = !tipExtendedRef.current;
    tipExtendedRef.current = next;
    setTipExtended(next);
    setClickCount((c) => c + 1);
    setPulseWaveId((w) => w + 1);
    clickTriggerTimeRef.current = performance.now();
    rippleTriggerRef.current?.();
    soundEngine.playRatchetClick(next);
    requestRenderRef.current?.();
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Sync material & engraving updates
  useEffect(() => {
    if (penRef.current) {
      penRef.current.applyMaterial(materialId);
      penRef.current.updateEngraving(engravingText, materialId);
      requestRenderRef.current?.();
    }
  }, [materialId, engravingText]);

  // Mount interactive Three.js Feel Lab viewport + Acoustic Ink-Ripple Pedestal once (transparent backdrop)
  useEffect(() => {
    const mount = canvasMountRef.current;
    const sectionEl = sectionRef.current;
    if (!mount || !sectionEl) return;

    let rig: ReturnType<typeof createStudioRig>;
    try {
      rig = createStudioRig(mount, 30, true);
    } catch {
      return;
    }

    const { scene, renderer, camera, isSoftwareGl } = rig;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const pen = buildPenAssembly(materialId, maxAnisotropy, engravingText);
    penRef.current = pen;

    const penPivot = new THREE.Group();
    penPivot.add(pen.root);
    penPivot.rotation.set(0.14, 0.44, -0.68);
    penPivot.position.set(0, 0.14, 0);
    scene.add(penPivot);

    const pedestal = createRipplePedestal();
    scene.add(pedestal.mesh);
    rippleTriggerRef.current = () => {
      pedestal.triggerPulse();
    };

    camera.position.set(0, 0.2, 10.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.78;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    let currentTipExt = 0;
    let currentCapTravel = 0;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let isDisposed = false;

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
      if (isDisposed || !isVisibleRef.current) return;
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

        const targetTip = tipExtendedRef.current ? 0.21 : 0;
        const sinceClick = (now - clickTriggerTimeRef.current) / 1000;
        const overtravel =
          sinceClick >= 0 && sinceClick < 0.14
            ? Math.sin((sinceClick / 0.14) * Math.PI) * 0.14
            : 0;
        const targetCap = (tipExtendedRef.current ? 0.095 : 0) + overtravel;

        if (isSoftwareGl) {
          currentTipExt = targetTip;
          currentCapTravel = tipExtendedRef.current ? 0.095 : 0;
        } else {
          currentTipExt = THREE.MathUtils.damp(currentTipExt, targetTip, 22, dt);
          currentCapTravel = THREE.MathUtils.damp(currentCapTravel, targetCap, 28, dt);
        }

        pen.setClickerExtension(currentCapTravel, currentTipExt);
        const rippleActive = pedestal.update(now / 1000);
        const controlsChanged = controls.update();
        renderer.render(scene, camera);

        const animActive =
          !isSoftwareGl &&
          (Math.abs(currentTipExt - targetTip) > 0.001 ||
            Math.abs(currentCapTravel - targetCap) > 0.001 ||
            overtravel > 0.002 ||
            rippleActive ||
            controlsChanged);

        const done = () => {
          renderBusy = false;
          if (renderDirty || animActive) {
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

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      if (dx * dx + dy * dy > 36) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(pen.capHitMesh, false);
      if (hits.length > 0) {
        triggerMechanicalClick();
      }
    };

    const onControlsChange = () => requestRender();
    controls.addEventListener('change', onControlsChange);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        isVisibleRef.current = visible;
        if (visible) requestRender();
      },
      { threshold: 0.05 },
    );
    observer.observe(sectionEl);

    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer.disconnect();
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      pedestal.dispose();
      pen.dispose();
      rig.dispose();
    };
  }, []);

  const drawPaperGuide = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(20, 20, 19, 0.11)';
    const step = 28;
    for (let x = step; x < w - 16; x += step) {
      for (let y = step; y < h - 16; y += step) {
        c.fillRect(x, y, 1.1, 1.1);
      }
    }
    c.strokeStyle = 'rgba(180, 128, 76, 0.14)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(28, h * 0.54);
    c.lineTo(w - 28, h * 0.54);
    c.stroke();
  };

  useEffect(() => {
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPaperGuide(ctx, rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  /** Multi-species Gongbi watercolor botanicals along handwritten ink strokes */
  const sproutOnStroke = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    seedVal: number,
  ) => {
    drawBotanicalSprout(ctx, flowerStyleRef.current, x, y, angle, seedVal);
  };

  const drawingRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    midX: number;
    midY: number;
    lastTime: number;
    distSinceSprout: number;
  }>({
    active: false,
    lastX: 0,
    lastY: 0,
    midX: 0,
    midY: 0,
    lastTime: 0,
    distSinceSprout: 0,
  });

  const handlePaperPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!tipExtendedRef.current) {
      triggerMechanicalClick();
    }

    drawingRef.current = {
      active: true,
      lastX: x,
      lastY: y,
      midX: x,
      midY: y,
      lastTime: performance.now(),
      distSinceSprout: 0,
    };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#141413';
      ctx.beginPath();
      ctx.arc(x, y, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    setInkMetrics((prev) => ({ ...prev, strokeCount: prev.strokeCount + 1 }));
  };

  const handlePaperPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return;
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    const dt = Math.max(1, now - drawingRef.current.lastTime);
    const dx = x - drawingRef.current.lastX;
    const dy = y - drawingRef.current.lastY;
    const dist = Math.hypot(dx, dy);
    const velocity = dist / dt;

    const { strokePx, apparentMm } = computeInkWidth(velocity);

    const newMidX = (drawingRef.current.lastX + x) * 0.5;
    const newMidY = (drawingRef.current.lastY + y) * 0.5;

    ctx.strokeStyle = '#141413';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokePx;
    ctx.beginPath();
    ctx.moveTo(drawingRef.current.midX, drawingRef.current.midY);
    ctx.quadraticCurveTo(
      drawingRef.current.lastX,
      drawingRef.current.lastY,
      newMidX,
      newMidY,
    );
    ctx.stroke();

    drawingRef.current.distSinceSprout += dist;
    if (writingModeRef.current === 'poetic' && drawingRef.current.distSinceSprout >= 20) {
      drawingRef.current.distSinceSprout = 0;
      sproutOnStroke(ctx, x, y, Math.atan2(dy, dx), x + y);
    }

    drawingRef.current.lastX = x;
    drawingRef.current.lastY = y;
    drawingRef.current.midX = newMidX;
    drawingRef.current.midY = newMidY;
    drawingRef.current.lastTime = now;

    setInkMetrics((prev) => ({ ...prev, lastWidthMm: apparentMm.toFixed(2) }));
  };

  const handlePaperPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return;
    drawingRef.current.active = false;
    paperCanvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clearPaperCanvas = () => {
    const canvas = paperCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    if (!ctx || !parent) return;
    const rect = parent.getBoundingClientRect();
    drawPaperGuide(ctx, rect.width, rect.height);
    setInkMetrics({ strokeCount: 0, lastWidthMm: '0.38' });
  };

  const currentMaterial = PEN_MATERIALS[materialId];
  const currentFlowerSpec = FLOWER_STYLE_MAP[flowerStyle];

  return (
    <section
      id="feel"
      ref={sectionRef}
      className="relative z-10 scroll-mt-16 border-t border-[#141619]/10 bg-[#FAF8F4]/55 backdrop-blur-sm py-24 md:py-32"
      data-testid="feel-lab-section"
      data-tip-extended={tipExtended ? 'true' : 'false'}
      data-material={materialId}
      data-writing-mode={writingMode}
      data-flower-style={flowerStyle}
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        {/* Open Exhibition Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[#141619]/10 pb-8">
          <div>
            <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
              02. 听风 · 素纸生春
            </p>
            <h2
              className="mt-2 font-editorial text-3xl md:text-5xl font-medium tracking-tight text-[#141619]"
              style={{ textWrap: 'balance' }}
            >
              按一下，声波荡漾；写两笔，纸上生春。
            </h2>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex items-center gap-2 self-start md:self-auto border border-[#141619]/15 bg-[#FAF8F4]/85 px-4 py-2 text-xs font-medium text-[#141619] transition-colors hover:border-[#9C6226] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
            aria-label={muted ? '开启棘轮音效' : '静音棘轮音效'}
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 text-[#4C525C]" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[#9C6226]" />
            )}
            <span>{muted ? '共鸣音已静音' : '金属共鸣音开启'}</span>
          </button>
        </div>

        {/* Open Gallery Diptych */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-stretch">
          {/* LEFT: Open 3D Pen Stage over Acoustic Concentric Orbit + Tactile Finishes */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="relative h-[390px] sm:h-[440px] w-full overflow-hidden border border-[#141619]/10 bg-[#FAF8F4]/68 backdrop-blur-md px-4">
              {/* Subtle concentric acoustic compass rings behind pen */}
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <div className="h-[290px] w-[290px] rounded-full border border-[#141619]/10" />
                <div className="absolute h-[380px] w-[380px] rounded-full border border-dashed border-[#9C6226]/30" />
              </div>

              <div
                ref={canvasMountRef}
                className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing"
                data-testid="feel-lab-3d-canvas"
                aria-label="M-01 材质与按动测试 3D 工作台，点击笔帽触发按动与声波涟漪，拖拽旋转"
              />

              <div className="pointer-events-none absolute top-3 left-4 right-4 z-20 flex items-center justify-between text-xs">
                <span className="font-mono-tech text-[#4C525C]">
                  {currentMaterial.englishName}
                </span>
                <span
                  className="font-mono-tech tabular-nums font-medium text-[#141619]"
                  data-testid="tip-state-label"
                >
                  {tipExtended ? '笔尖已锁止出芯 (±0.02mm)' : '笔尖已收起'}
                </span>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-4 z-20 text-[11px] text-[#4C525C]">
                轻触 3D 笔帽可同时激起底座声波涟漪 · 拖拽旋转检视表面光泽
              </div>
            </div>

            {/* Borderless Material Palette & Acoustic Click Trigger */}
            <div className="mt-6 border-t border-[#141619]/10 pt-6 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between text-xs text-[#4C525C] mb-3">
                  <span>触感表面材质实时切换</span>
                  <span className="font-mono-tech tabular-nums font-medium text-[#9C6226]">
                    {currentMaterial.name}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MATERIAL_LIST.map((mat) => {
                    const active = mat.id === materialId;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => onSelectMaterial(mat.id)}
                        aria-pressed={active}
                        className={`flex items-center gap-2.5 border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226] ${
                          active
                            ? 'border-[#9C6226] bg-[#9C6226]/12 text-[#141619]'
                            : 'border-[#141619]/12 bg-[#FAF8F4]/78 text-[#4C525C] hover:border-[#141619]/35 hover:text-[#141619]'
                        }`}
                      >
                        <span
                          className="h-4 w-4 shrink-0 border border-[#141619]/20"
                          style={{
                            background: `linear-gradient(135deg, ${mat.swatchHighlightHex}, ${mat.swatchHex})`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium leading-tight">
                          {mat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#4C525C]">
                  {currentMaterial.finishNote}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#141619]/10 pt-5">
                <div className="flex items-center gap-4">
                  {/* Live mechanical pulse bars reacting on click */}
                  <div className="flex h-6 items-end gap-1" aria-hidden="true">
                    {[0.45, 0.9, 0.65, 1, 0.55].map((scale, idx) => (
                      <span
                        key={`${pulseWaveId}-${idx}`}
                        className="w-0.5 bg-[#9C6226] transition-all duration-300"
                        style={{
                          height: `${Math.round(
                            (clickCount > 0 && idx % 2 === pulseWaveId % 2
                              ? scale * 22
                              : scale * 11),
                          )}px`,
                          opacity: clickCount > 0 ? 0.92 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#141619]">
                      全金属双段棘轮清脆落位
                    </p>
                    <p className="mt-0.5 font-mono-tech text-xs text-[#4C525C] tabular-nums">
                      累计按动 {clickCount} 次 · 120,000 次无磨损寿命
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={triggerMechanicalClick}
                  data-testid="click-pen-cap-btn"
                  className="border border-[#141619] bg-[#141619] px-5 py-2.5 text-xs font-medium tracking-wide text-[#FAF8F4] transition-colors duration-100 active:scale-[0.97] hover:border-[#9C6226] hover:bg-[#9C6226] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9C6226]"
                >
                  {tipExtended ? '按动收起笔尖' : '按动出芯 · 听声'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Floating Xuan-Cotton Archival Scroll */}
          <div className="lg:col-span-6 flex flex-col justify-between border border-[#141619]/12 bg-[#FAF8F4]/82 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#141619]/10 px-6 py-4">
              <div>
                <h3 className="text-sm font-medium text-[#141619]">
                  0.38mm 双相墨水 · 素纸生春画卷
                </h3>
                <p className="mt-0.5 text-xs text-[#4C525C]">
                  300gsm 无酸棉浆纸纹 · 行笔处随锋芒绽放层瓣繁花
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-[#141619]/15 bg-white/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setWritingMode('poetic')}
                    aria-pressed={writingMode === 'poetic'}
                    className={`px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                      writingMode === 'poetic'
                        ? 'bg-[#9C6226] text-[#FAF8F4] font-medium'
                        : 'text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    落笔生花
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingMode('pure')}
                    aria-pressed={writingMode === 'pure'}
                    className={`px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                      writingMode === 'pure'
                        ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                        : 'text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    纯粹墨迹
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearPaperCanvas}
                  className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/70 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>清除</span>
                </button>

                {onOpenStudioFullscreen && (
                  <button
                    type="button"
                    onClick={onOpenStudioFullscreen}
                    data-testid="feel-open-studio-btn"
                    className="inline-flex items-center gap-1.5 border border-[#9C6226] bg-[#9C6226]/10 px-3 py-1.5 text-xs font-medium text-[#9C6226] transition-colors hover:bg-[#9C6226] hover:text-[#FAF8F4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>大屏画室</span>
                  </button>
                )}
              </div>
            </div>

            {writingMode === 'poetic' && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141619]/10 bg-white/55 px-6 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="落笔生花花卉样式">
                  {FLOWER_STYLE_LIST.map((item) => {
                    const active = item.id === flowerStyle;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`flower-style-${item.id}`}
                        aria-pressed={active}
                        onClick={() => setFlowerStyle(item.id)}
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226] ${
                          active
                            ? 'border-[#9C6226] bg-[#9C6226]/14 text-[#141619] font-medium'
                            : 'border-[#141619]/12 bg-white/70 text-[#4C525C] hover:border-[#141619]/30 hover:text-[#141619]'
                        }`}
                      >
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ backgroundColor: item.swatchHex }}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-[#4C525C]">
                  {currentFlowerSpec.subtitle}
                </span>
              </div>
            )}

            <div
              className="relative flex-1 min-h-[380px] sm:min-h-[430px] overflow-hidden"
              style={{
                backgroundColor: '#F5F2EA',
                backgroundImage:
                  'radial-gradient(rgba(20,20,19,0.035) 1px, transparent 0), radial-gradient(rgba(160,145,120,0.045) 1px, transparent 0)',
                backgroundSize: '18px 18px, 11px 11px',
                backgroundPosition: '0 0, 5px 7px',
              }}
            >
              <canvas
                ref={paperCanvasRef}
                data-testid="paper-writing-canvas"
                onPointerDown={handlePaperPointerDown}
                onPointerMove={handlePaperPointerMove}
                onPointerUp={handlePaperPointerUp}
                onPointerCancel={handlePaperPointerUp}
                className="h-full w-full touch-none cursor-crosshair block"
                aria-label="纸面试写画布，使用鼠标或手指滑动书写测试 0.38mm 碳化钨笔尖落笔墨水质感与生花效果"
              />

              {inkMetrics.strokeCount === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <p className="font-editorial text-2xl text-[#141413]/45">
                    在此落笔试写
                  </p>
                  <p className="mt-1.5 font-mono-tech text-xs text-[#141413]/40">
                    {writingMode === 'poetic'
                      ? `当前花样：${currentFlowerSpec.name} · 亦可随时切换其他花种叠加共绘`
                      : '慢写沉稳出墨 · 快划锋利收笔'}
                  </p>
                </div>
              )}

              {/* Subtle collector ink seal in bottom-right of paper */}
              <div className="pointer-events-none absolute bottom-4 right-5 flex items-center gap-2.5">
                <span className="font-mono-tech text-[11px] text-[#141413]/45 tabular-nums">
                  0.38MM ARCHIVAL INK
                </span>
                <span
                  className="border border-[#B84A39]/55 px-1.5 py-0.5 font-editorial text-[10px] text-[#B84A39]/75"
                  aria-hidden="true"
                >
                  万象
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#141619]/10 px-6 py-4 text-xs">
              <div className="flex items-center gap-6 font-mono-tech tabular-nums">
                <div>
                  <span className="text-[#4C525C] mr-2">实时模拟线宽</span>
                  <span className="font-medium text-[#141619]" data-testid="ink-width-readout">
                    {inkMetrics.lastWidthMm} mm
                  </span>
                </div>
                <div>
                  <span className="text-[#4C525C] mr-2">落笔次数</span>
                  <span className="font-medium text-[#141619]" data-testid="ink-stroke-count">
                    {inkMetrics.strokeCount}
                  </span>
                </div>
              </div>
              <span className="text-[#4C525C]">
                碳化钨球珠 · 零虚位不刮纸
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
