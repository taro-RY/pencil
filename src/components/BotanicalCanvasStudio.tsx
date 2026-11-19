import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  Maximize2,
  Minimize2,
  PenTool,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { computeInkWidth } from '../utils/penConfig';
import {
  FLOWER_STYLE_LIST,
  FLOWER_STYLE_MAP,
  FlowerStyleId,
  drawBotanicalSprout,
} from '../utils/paperBotanicals';
import {
  BloomDensityId,
  INK_COLORS,
  InkColorId,
  NIB_SIZES,
  NibSizeId,
  PAPER_PRESETS,
  PaperPresetId,
  StudioHistoryState,
  StudioStroke,
  StudioToolMode,
  clearStudioWithUndo,
  commitStudioStroke,
  createStudioHistory,
  drawPaperBackground,
  getPaperPreset,
  redoStudioHistory,
  renderSingleStroke,
  renderStudioArtwork,
  undoStudioHistory,
} from '../utils/canvasStudio';

interface BotanicalCanvasStudioProps {
  externalFullscreenTrigger?: number;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

export const BotanicalCanvasStudio: React.FC<BotanicalCanvasStudioProps> = ({
  externalFullscreenTrigger = 0,
  onFullscreenChange,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<StudioHistoryState>(() => createStudioHistory());
  const [tool, setTool] = useState<StudioToolMode>('poetic');
  const [flowerStyle, setFlowerStyle] = useState<FlowerStyleId>('blueAster');
  const [inkColorId, setInkColorId] = useState<InkColorId>('indigo');
  const [nibSizeId, setNibSizeId] = useState<NibSizeId>('standard');
  const [paperPresetId, setPaperPresetId] = useState<PaperPresetId>('xuan-white');
  const [bloomDensity, setBloomDensity] = useState<BloomDensityId>('lush');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastWidthMm, setLastWidthMm] = useState('0.38');

  const historyRef = useRef(history);
  historyRef.current = history;

  const isFullscreenRef = useRef(isFullscreen);
  isFullscreenRef.current = isFullscreen;

  const activeStrokeRef = useRef<{
    stroke: StudioStroke;
    lastX: number;
    lastY: number;
    midX: number;
    midY: number;
    lastTime: number;
    distSinceSprout: number;
    canvasW: number;
    canvasH: number;
  } | null>(null);

  const strokeCounterRef = useRef(1);
  const skipNextInkRebuildRef = useRef(false);

  useEffect(() => {
    if (externalFullscreenTrigger > 0) {
      setIsFullscreen(true);
    }
  }, [externalFullscreenTrigger]);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  // Auto-select readable contrasting ink when switching between light and dark papers
  const handleSelectPaper = (nextPaperId: PaperPresetId) => {
    setPaperPresetId(nextPaperId);
    if (nextPaperId === 'night-gold' && inkColorId === 'sumi') {
      setInkColorId('gold');
    } else if (nextPaperId !== 'night-gold' && inkColorId === 'gold') {
      setInkColorId('sumi');
    }
  };

  const handleUndo = useCallback(() => {
    skipNextInkRebuildRef.current = false;
    setHistory((prev) => undoStudioHistory(prev));
  }, []);

  const handleRedo = useCallback(() => {
    skipNextInkRebuildRef.current = false;
    setHistory((prev) => redoStudioHistory(prev));
  }, []);

  const handleClear = useCallback(() => {
    skipNextInkRebuildRef.current = false;
    setHistory((prev) => clearStudioWithUndo(prev));
    setLastWidthMm('0.38');
  }, []);

  // Global keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Y / Ctrl+Shift+Z, Esc exits fullscreen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape' && isFullscreenRef.current) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (k === 'y' && !e.shiftKey) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Lock page scroll only while fullscreen studio is open
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const compositePaperAndInk = useCallback(() => {
    const display = displayCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!display || !inkCanvas) return;

    const dCtx = display.getContext('2d');
    if (!dCtx) return;

    const rect = display.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const preset = getPaperPreset(paperPresetId);

    dCtx.clearRect(0, 0, w, h);
    drawPaperBackground(dCtx, w, h, preset, true);
    dCtx.drawImage(inkCanvas, 0, 0, w, h);
  }, [paperPresetId]);

  const rebuildCanvas = useCallback(() => {
    const display = displayCanvasRef.current;
    if (!display) return;

    if (!inkCanvasRef.current) {
      inkCanvasRef.current = document.createElement('canvas');
    }
    const inkCanvas = inkCanvasRef.current;
    const rect = display.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    display.width = Math.max(1, Math.floor(w * dpr));
    display.height = Math.max(1, Math.floor(h * dpr));
    inkCanvas.width = display.width;
    inkCanvas.height = display.height;

    const dCtx = display.getContext('2d');
    const iCtx = inkCanvas.getContext('2d');
    if (!dCtx || !iCtx) return;

    dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    iCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderStudioArtwork(iCtx, historyRef.current.present, w, h);
    if (activeStrokeRef.current) {
      renderSingleStroke(iCtx, activeStrokeRef.current.stroke, w, h);
    }

    const preset = getPaperPreset(paperPresetId);
    dCtx.clearRect(0, 0, w, h);
    drawPaperBackground(dCtx, w, h, preset, true);
    dCtx.drawImage(inkCanvas, 0, 0, w, h);
  }, [paperPresetId]);

  useEffect(() => {
    if (skipNextInkRebuildRef.current) {
      skipNextInkRebuildRef.current = false;
      return;
    }
    rebuildCanvas();
  }, [history, rebuildCanvas]);

  useEffect(() => {
    compositePaperAndInk();
  }, [paperPresetId, compositePaperAndInk]);

  useEffect(() => {
    rebuildCanvas();
  }, [isFullscreen, rebuildCanvas]);

  useEffect(() => {
    const display = displayCanvasRef.current;
    if (!display) return;

    const onResize = () => rebuildCanvas();
    window.addEventListener('resize', onResize);

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(display);

    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [rebuildCanvas]);

  const activeInkSpec = INK_COLORS.find((c) => c.id === inkColorId) ?? INK_COLORS[0];
  const activeNibSpec = NIB_SIZES.find((n) => n.id === nibSizeId) ?? NIB_SIZES[1];
  const activePaperSpec = getPaperPreset(paperPresetId);
  const activeFlowerSpec = FLOWER_STYLE_MAP[flowerStyle];

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const display = displayCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!display || !inkCanvas) return;

    display.setPointerCapture(e.pointerId);
    const rect = display.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const x = Math.max(0, Math.min(w, e.clientX - rect.left));
    const y = Math.max(0, Math.min(h, e.clientY - rect.top));
    const nx = x / w;
    const ny = y / h;

    const stroke: StudioStroke = {
      id: strokeCounterRef.current++,
      tool,
      flowerStyle,
      inkHex: activeInkSpec.hex,
      nibScale: activeNibSpec.scale,
      points: [{ nx, ny, widthPx: 1.85 }],
      sprouts: [],
    };

    activeStrokeRef.current = {
      stroke,
      lastX: x,
      lastY: y,
      midX: x,
      midY: y,
      lastTime: performance.now(),
      distSinceSprout: 0,
      canvasW: w,
      canvasH: h,
    };
    setIsDrawing(true);

    const iCtx = inkCanvas.getContext('2d');
    if (iCtx) {
      iCtx.save();
      if (tool === 'eraser') {
        iCtx.globalCompositeOperation = 'destination-out';
        iCtx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        iCtx.globalCompositeOperation = 'source-over';
        iCtx.fillStyle = activeInkSpec.hex;
      }
      const dotR = tool === 'eraser' ? 12 * activeNibSpec.scale : 1.15 * activeNibSpec.scale;
      iCtx.beginPath();
      iCtx.arc(x, y, dotR, 0, Math.PI * 2);
      iCtx.fill();
      iCtx.restore();
      compositePaperAndInk();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    const display = displayCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!active || !display || !inkCanvas) return;

    const iCtx = inkCanvas.getContext('2d');
    if (!iCtx) return;

    const rect = display.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const x = Math.max(0, Math.min(w, e.clientX - rect.left));
    const y = Math.max(0, Math.min(h, e.clientY - rect.top));
    const now = performance.now();
    const dt = Math.max(1, now - active.lastTime);
    const dx = x - active.lastX;
    const dy = y - active.lastY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.7) return;

    const velocity = dist / dt;
    const { strokePx, apparentMm } = computeInkWidth(velocity);

    const nx = x / w;
    const ny = y / h;
    active.stroke.points.push({ nx, ny, widthPx: strokePx });

    const newMidX = (active.lastX + x) * 0.5;
    const newMidY = (active.lastY + y) * 0.5;

    iCtx.save();
    if (active.stroke.tool === 'eraser') {
      iCtx.globalCompositeOperation = 'destination-out';
      iCtx.strokeStyle = 'rgba(0,0,0,1)';
      iCtx.lineWidth = 24 * active.stroke.nibScale;
    } else {
      iCtx.globalCompositeOperation = 'source-over';
      iCtx.strokeStyle = active.stroke.inkHex;
      iCtx.lineWidth = Math.max(0.75, strokePx * active.stroke.nibScale);
    }
    iCtx.lineCap = 'round';
    iCtx.lineJoin = 'round';
    iCtx.beginPath();
    iCtx.moveTo(active.midX, active.midY);
    iCtx.quadraticCurveTo(active.lastX, active.lastY, newMidX, newMidY);
    iCtx.stroke();
    iCtx.restore();

    const sproutThreshold = bloomDensity === 'lush' ? 17 : 30;
    active.distSinceSprout += dist;
    if (active.stroke.tool === 'poetic' && active.distSinceSprout >= sproutThreshold) {
      active.distSinceSprout = 0;
      const angle = Math.atan2(dy, dx);
      const afterPointIndex = active.stroke.points.length - 1;
      const seed =
        Math.round((active.stroke.id * 41.7 + afterPointIndex * 13.3 + x * 0.37 + y * 0.53) * 100) /
        100;
      active.stroke.sprouts.push({ nx, ny, angle, seed, afterPointIndex });
      drawBotanicalSprout(iCtx, active.stroke.flowerStyle, x, y, angle, seed);
    }

    active.lastX = x;
    active.lastY = y;
    active.midX = newMidX;
    active.midY = newMidY;
    active.lastTime = now;

    compositePaperAndInk();
    setLastWidthMm(apparentMm.toFixed(2));
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current;
    if (!active) return;
    activeStrokeRef.current = null;
    setIsDrawing(false);
    try {
      displayCanvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture already released
    }
    skipNextInkRebuildRef.current = true;
    setHistory((prev) => commitStudioStroke(prev, active.stroke));
  };

  const handleExportPng = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(960, Math.round(rect.width));
    const h = Math.max(600, Math.round(rect.height));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w * 2;
    outCanvas.height = h * 2;
    const outCtx = outCanvas.getContext('2d');

    const expInkCanvas = document.createElement('canvas');
    expInkCanvas.width = w * 2;
    expInkCanvas.height = h * 2;
    const expInkCtx = expInkCanvas.getContext('2d');

    if (!outCtx || !expInkCtx) return;

    outCtx.setTransform(2, 0, 0, 2, 0, 0);
    expInkCtx.setTransform(2, 0, 0, 2, 0, 0);

    renderStudioArtwork(expInkCtx, history.present, w, h);
    drawPaperBackground(outCtx, w, h, activePaperSpec, true);
    outCtx.drawImage(expInkCanvas, 0, 0, w, h);

    const link = document.createElement('a');
    link.download = `M01-素纸生春-${history.present.length}笔.png`;
    link.href = outCanvas.toDataURL('image/png');
    link.click();
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const strokeCount = history.present.length;

  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-[#F4F1EA] text-[#141619]'
    : 'relative z-10 scroll-mt-16 border-t border-[#141619]/10 bg-[#FAF8F4]/55 backdrop-blur-sm py-20 md:py-28';

  const containerClass = isFullscreen
    ? 'flex flex-1 flex-col min-h-0 px-4 py-3 md:px-8 md:py-4'
    : 'mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10';

  return (
    <section
      id="studio"
      className={wrapperClass}
      data-testid="botanical-canvas-studio"
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      data-tool={tool}
      data-paper={paperPresetId}
      data-flower-style={flowerStyle}
      data-can-undo={canUndo ? 'true' : 'false'}
      data-can-redo={canRedo ? 'true' : 'false'}
    >
      <div className={containerClass}>
        {/* Header Bar */}
        <div
          className={`flex flex-wrap items-end justify-between gap-4 border-b border-[#141619]/10 ${
            isFullscreen ? 'pb-3' : 'pb-7'
          }`}
        >
          <div>
            <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
              02B · 大屏素纸画室
            </p>
            <h2
              className={`font-editorial font-medium tracking-tight text-[#141619] ${
                isFullscreen ? 'mt-0.5 text-xl md:text-2xl' : 'mt-2 text-3xl md:text-5xl'
              }`}
              style={{ textWrap: 'balance' }}
            >
              万象长卷，一笔生春。
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              data-testid="studio-undo-btn"
              title="撤销 (Ctrl+Z)"
              className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/80 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap shrink-0"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>撤销</span>
              <span className="hidden sm:inline font-mono-tech text-[10px] text-[#4C525C]">Ctrl+Z</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              data-testid="studio-redo-btn"
              title="重做 (Ctrl+Shift+Z)"
              className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/80 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap shrink-0"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span>重做</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokeCount === 0}
              data-testid="studio-clear-btn"
              className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/80 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>清空</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              data-testid="studio-export-btn"
              className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/80 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>导出高清图</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              data-testid="studio-fullscreen-btn"
              className="inline-flex items-center gap-1.5 border border-[#141619] bg-[#141619] px-3.5 py-1.5 text-xs font-medium text-[#FAF8F4] transition-colors hover:border-[#9C6226] hover:bg-[#9C6226] whitespace-nowrap shrink-0"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>退出全屏 (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>全屏沉浸</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Toolbar Strip */}
        <div
          className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#141619]/12 bg-[#FAF8F4]/88 backdrop-blur-md px-4 py-3 ${
            isFullscreen ? 'mt-2 border-x border-t' : 'mt-6 border-x border-t'
          }`}
        >
          {/* Left: Mode + Flower styles */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-[#141619]/15 bg-white/75 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTool('poetic')}
                data-testid="studio-tool-poetic"
                aria-pressed={tool === 'poetic'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                  tool === 'poetic'
                    ? 'bg-[#9C6226] text-[#FAF8F4] font-medium'
                    : 'text-[#4C525C] hover:text-[#141619]'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>落笔生花</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('pure')}
                data-testid="studio-tool-pure"
                aria-pressed={tool === 'pure'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                  tool === 'pure'
                    ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                    : 'text-[#4C525C] hover:text-[#141619]'
                }`}
              >
                <PenTool className="h-3 w-3" />
                <span>纯粹墨迹</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('eraser')}
                data-testid="studio-tool-eraser"
                aria-pressed={tool === 'eraser'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                  tool === 'eraser'
                    ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                    : 'text-[#4C525C] hover:text-[#141619]'
                }`}
              >
                <Eraser className="h-3 w-3" />
                <span>橡皮擦</span>
              </button>
            </div>

            {tool === 'poetic' && (
              <>
                <div className="h-4 w-px bg-[#141619]/15 hidden sm:block" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="画室花种样式">
                  {FLOWER_STYLE_LIST.map((item) => {
                    const active = item.id === flowerStyle;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`studio-flower-${item.id}`}
                        aria-pressed={active}
                        onClick={() => setFlowerStyle(item.id)}
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'border-[#9C6226] bg-[#9C6226]/14 text-[#141619] font-medium'
                            : 'border-[#141619]/12 bg-white/75 text-[#4C525C] hover:border-[#141619]/30 hover:text-[#141619]'
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
              </>
            )}
          </div>

          {/* Right: Ink colors + Nib width + Paper surface + Density */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Ink Swatches */}
            <div className="flex items-center gap-1.5" role="group" aria-label="墨色选择">
              <span className="text-[11px] text-[#4C525C] mr-1">墨色</span>
              {INK_COLORS.map((c) => {
                const active = c.id === inkColorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setInkColorId(c.id);
                      if (tool === 'eraser') setTool('poetic');
                    }}
                    data-testid={`studio-ink-${c.id}`}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={active}
                    className={`h-5 w-5 border transition-transform ${
                      active
                        ? 'border-[#9C6226] scale-110 ring-1 ring-[#9C6226]/60'
                        : 'border-[#141619]/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>

            {/* Nib Width */}
            <div className="flex items-center border border-[#141619]/15 bg-white/75 text-[11px]">
              {NIB_SIZES.map((n) => {
                const active = n.id === nibSizeId;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNibSizeId(n.id)}
                    data-testid={`studio-nib-${n.id}`}
                    aria-pressed={active}
                    className={`px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                        : 'text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    {n.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Bloom Density */}
            {tool === 'poetic' && (
              <div className="flex items-center border border-[#141619]/15 bg-white/75 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBloomDensity('sparse')}
                  aria-pressed={bloomDensity === 'sparse'}
                  className={`px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                    bloomDensity === 'sparse'
                      ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                      : 'text-[#4C525C] hover:text-[#141619]'
                  }`}
                >
                  疏枝
                </button>
                <button
                  type="button"
                  onClick={() => setBloomDensity('lush')}
                  aria-pressed={bloomDensity === 'lush'}
                  className={`px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                    bloomDensity === 'lush'
                      ? 'bg-[#141619] text-[#FAF8F4] font-medium'
                      : 'text-[#4C525C] hover:text-[#141619]'
                  }`}
                >
                  繁英
                </button>
              </div>
            )}

            {/* Paper Surface Presets */}
            <div className="flex items-center border border-[#141619]/15 bg-white/75 text-[11px]" role="group" aria-label="纸面材质">
              {PAPER_PRESETS.map((p) => {
                const active = p.id === paperPresetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPaper(p.id)}
                    data-testid={`studio-paper-${p.id}`}
                    aria-pressed={active}
                    className={`px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#9C6226]/20 text-[#141619] font-medium'
                        : 'text-[#4C525C] hover:text-[#141619]'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Large-Screen Interactive Paper Canvas Stage */}
        <div
          ref={stageRef}
          className={`relative w-full overflow-hidden border-x border-b border-[#141619]/12 ${
            isFullscreen ? 'flex-1 min-h-0' : 'h-[560px] sm:h-[640px] lg:h-[700px]'
          }`}
          style={{ backgroundColor: activePaperSpec.bgHex }}
        >
          <canvas
            ref={displayCanvasRef}
            data-testid="studio-drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            className="block h-full w-full touch-none cursor-crosshair"
            aria-label="M-01 大屏落笔生花创作画板，支持多种花样、墨色、纸张与 Ctrl+Z 撤销"
          />

          {strokeCount === 0 && !isDrawing && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <p
                className={`font-editorial text-2xl sm:text-3xl ${
                  activePaperSpec.isDark ? 'text-[#F6F4EF]/45' : 'text-[#141413]/42'
                }`}
              >
                在此挥毫落笔 · 大屏自由创作
              </p>
              <p
                className={`mt-2 font-mono-tech text-xs ${
                  activePaperSpec.isDark ? 'text-[#F6F4EF]/38' : 'text-[#141413]/38'
                }`}
              >
                {tool === 'poetic'
                  ? `当前花样：${activeFlowerSpec.name} · ${activeFlowerSpec.subtitle}`
                  : tool === 'pure'
                    ? '纯粹墨迹书写模式 · 慢行沉稳，快划锋锐'
                    : '橡皮擦模式 · 轻扫擦除局部墨迹'}
              </p>
            </div>
          )}
        </div>

        {/* Telemetry & Shortcut Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-x border-b border-[#141619]/12 bg-[#FAF8F4]/88 backdrop-blur-md px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-5 font-mono-tech tabular-nums">
            <div>
              <span className="text-[#4C525C] mr-1.5">已绘笔划</span>
              <span className="font-medium text-[#141619]" data-testid="studio-stroke-count">
                {strokeCount}
              </span>
            </div>
            <div>
              <span className="text-[#4C525C] mr-1.5">瞬时锋径</span>
              <span className="font-medium text-[#141619]">{lastWidthMm} mm</span>
            </div>
            <div>
              <span className="text-[#4C525C] mr-1.5">当前配置</span>
              <span className="font-medium text-[#9C6226]">
                {activePaperSpec.name} · {activeInkSpec.name}
              </span>
            </div>
          </div>
          <span className="font-mono-tech text-[11px] text-[#4C525C]">
            快捷键：Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · 切换纸张不丢失当前笔迹
          </span>
        </div>
      </div>
    </section>
  );
};
