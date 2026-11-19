import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  MATERIAL_LIST,
  MAX_ENGRAVING_LENGTH,
  MaterialId,
  OrderSummary,
  PEN_MATERIALS,
  buildOrderSummary,
  validateEngraving,
} from '../utils/penConfig';

interface OrderSectionProps {
  materialId: MaterialId;
  onSelectMaterial: (id: MaterialId) => void;
  engravingText: string;
  onEngravingChange: (text: string) => void;
}

const POETIC_PRESETS = ['静水流深', '一笔万象', '知行合一', 'CARPE'];

export const OrderSection: React.FC<OrderSectionProps> = ({
  materialId,
  onSelectMaterial,
  engravingText,
  onEngravingChange,
}) => {
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [laserSparkKey, setLaserSparkKey] = useState(0);

  const engravingValidation = validateEngraving(engravingText);
  const activeMaterial = PEN_MATERIALS[materialId];

  const applyEngraving = (rawValue: string) => {
    const next = validateEngraving(rawValue).sanitized;
    onEngravingChange(next);
    setLaserSparkKey((k) => k + 1);
    if (orderSummary) setOrderSummary(null);
  };

  const handleEngravingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyEngraving(e.target.value);
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const summary = buildOrderSummary(materialId, engravingValidation.sanitized);
    setOrderSummary(summary);
  };

  const handleCopyOrderNo = async () => {
    if (!orderSummary) return;
    try {
      await navigator.clipboard.writeText(orderSummary.orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <section
      id="order"
      className="relative z-10 scroll-mt-16 border-t border-[#141619]/10 bg-[#FAF8F4]/55 backdrop-blur-sm py-24 md:py-32"
      data-testid="order-section"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-[#141619]/10 pb-8">
          <div>
            <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
              04. 印记 · 工坊私藏定制
            </p>
            <h2
              className="mt-2 font-editorial text-3xl md:text-5xl font-medium tracking-tight text-[#141619]"
              style={{ textWrap: 'balance' }}
            >
              只做这一支笔，刻上你的印记。
            </h2>
          </div>
          <p className="font-mono-tech text-xs text-[#4C525C]">
            单支独立编号 CNC 铣削 · 光纤脉冲激光阴刻
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* LEFT: Bespoke Commissioning Atelier Controls */}
          <form
            onSubmit={handleConfirmOrder}
            className="lg:col-span-6 flex flex-col gap-8 border border-[#141619]/12 bg-[#FAF8F4]/86 backdrop-blur-md p-6 md:p-8"
          >
            {/* Finish Atelier Selection */}
            <div>
              <span className="block text-xs font-medium tracking-wide text-[#4C525C] mb-3">
                择材淬面 · 表面工艺
              </span>
              <div className="flex flex-col gap-3">
                {MATERIAL_LIST.map((mat) => {
                  const active = mat.id === materialId;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => {
                        onSelectMaterial(mat.id);
                        if (orderSummary) setOrderSummary(null);
                      }}
                      aria-pressed={active}
                      className={`flex items-center justify-between gap-4 border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226] ${
                        active
                          ? 'border-[#9C6226] bg-[#9C6226]/10'
                          : 'border-[#141619]/12 bg-white/75 hover:border-[#141619]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className="h-5 w-5 shrink-0 border border-[#141619]/20"
                          style={{
                            background: `linear-gradient(135deg, ${mat.swatchHighlightHex}, ${mat.swatchHex})`,
                          }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#141619]">
                            {mat.name}
                          </div>
                          <div className="mt-0.5 text-xs text-[#4C525C] truncate">
                            {mat.subtitle}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-tech text-sm font-medium text-[#141619] tabular-nums whitespace-nowrap shrink-0">
                        ¥ {mat.priceCny.toLocaleString('zh-CN')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clip Back Engraving + Poetic Inspiration Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="clip-engraving-input"
                  className="text-xs font-medium tracking-wide text-[#4C525C]"
                >
                  私藏落款 · 笔夹背面激光刻字（免费）
                </label>
                <span className="font-mono-tech text-xs text-[#4C525C] tabular-nums">
                  {engravingValidation.length} / {MAX_ENGRAVING_LENGTH}
                </span>
              </div>
              <input
                id="clip-engraving-input"
                type="text"
                value={engravingValidation.sanitized}
                onChange={handleEngravingInput}
                maxLength={MAX_ENGRAVING_LENGTH}
                placeholder="输入汉字、字母或年份，最多 8 个字符"
                className="w-full border border-[#141619]/18 bg-white/90 px-4 py-3 font-mono-tech text-sm tracking-wider text-[#141619] placeholder:text-[#4C525C]/55 focus:border-[#9C6226] focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#4C525C]">题刻灵感</span>
                {POETIC_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyEngraving(preset)}
                    className="border border-[#141619]/12 bg-white/75 px-2.5 py-1 text-[11px] text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226] whitespace-nowrap shrink-0"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Commission Confirmation Trigger */}
            <div className="border-t border-[#141619]/10 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono-tech text-2xl font-medium text-[#141619] tabular-nums">
                  ¥ {activeMaterial.priceCny.toLocaleString('zh-CN')}
                </div>
                <div className="mt-0.5 text-xs text-[#4C525C]">
                  附赠两支 0.38mm 定制双相墨水笔芯 · 终身机械保修
                </div>
              </div>

              <button
                type="submit"
                data-testid="generate-order-btn"
                className="border border-[#141619] bg-[#141619] px-6 py-3 text-xs font-medium tracking-wider text-[#FAF8F4] transition-colors hover:border-[#9C6226] hover:bg-[#9C6226] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9C6226]"
              >
                铸印落款 · 生成典藏单
              </button>
            </div>
          </form>

          {/* RIGHT: Live Macro Laser Clip Plaque + Collector Vermilion Seal Folio */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="border border-[#141619]/12 bg-[#FAF8F4]/86 backdrop-blur-md p-6 md:p-8">
              <div className="flex items-center justify-between text-xs text-[#4C525C] mb-6">
                <span>12° 钛合金笔夹背面微距激光刻字预览</span>
                <span className="font-mono-tech font-medium text-[#9C6226]">
                  0.08 MM FIBER ETCH
                </span>
              </div>

              <div className="relative flex items-center justify-center py-6">
                <svg
                  key={laserSparkKey}
                  viewBox="0 0 640 160"
                  className="w-full max-w-[560px] h-auto"
                  role="img"
                  aria-label={`笔夹背面刻字实时预览：${
                    engravingValidation.sanitized || '未刻字'
                  }`}
                >
                  <defs>
                    <linearGradient id="clip-metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={activeMaterial.swatchHighlightHex} />
                      <stop offset="55%" stopColor={activeMaterial.swatchHex} />
                      <stop offset="100%" stopColor="#16181D" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="30"
                    y="44"
                    width="580"
                    height="72"
                    rx="4"
                    fill="rgba(20,22,25,0.05)"
                    stroke="rgba(20,22,25,0.12)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="64,52 572,56 592,70 592,90 572,104 64,108 48,96 48,64"
                    fill="url(#clip-metal-grad)"
                    stroke="rgba(20,22,25,0.32)"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="64"
                    y1="57"
                    x2="570"
                    y2="60"
                    stroke="rgba(255,255,255,0.42)"
                    strokeWidth="0.9"
                  />
                  {/* Subtle laser pulse gleam when text updates */}
                  {engravingValidation.sanitized && (
                    <circle
                      cx="320"
                      cy="80"
                      r="14"
                      fill="rgba(156,98,38,0.22)"
                    />
                  )}
                  <text
                    x="320"
                    y="81"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={
                      materialId === 'obsidian-matte'
                        ? 'rgba(242,244,248,0.88)'
                        : 'rgba(18,19,22,0.86)'
                    }
                    fontSize="22"
                    letterSpacing="4"
                    fontFamily="IBM Plex Mono, Noto Serif SC, PingFang SC, monospace"
                    data-testid="clip-engraving-svg-text"
                  >
                    {engravingValidation.sanitized || 'M-01 · TI-6AL-4V'}
                  </text>
                </svg>
              </div>

              <div className="flex items-center justify-between border-t border-[#141619]/10 pt-4 text-xs text-[#4C525C]">
                <span>
                  {engravingValidation.sanitized
                    ? `落款铭文：「${engravingValidation.sanitized}」`
                    : '未填写刻字，保留出厂素面机械铭文'}
                </span>
                <span className="font-mono-tech">深度 0.08 mm</span>
              </div>
            </div>

            {orderSummary && (
              <div
                className="border border-[#9C6226] bg-[#FAF8F4]/92 backdrop-blur-md p-6 md:p-8"
                data-testid="order-confirmation-card"
                role="region"
                aria-label="M-01 定制订单确认卡片"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#141619]/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#B84A39] bg-[#B84A39]/12 font-editorial text-xs font-semibold leading-none text-[#B84A39]"
                      aria-hidden="true"
                    >
                      M01
                    </div>
                    <div>
                      <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
                        工坊典藏定制单已落印
                      </p>
                      <h3 className="mt-1 font-mono-tech text-lg font-medium text-[#141619] tabular-nums">
                        {orderSummary.orderNumber}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyOrderNo}
                    className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/80 px-3 py-1.5 text-xs text-[#141619] transition-colors hover:border-[#9C6226]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#9C6226]" />
                        <span>已复制编号</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>复制编号</span>
                      </>
                    )}
                  </button>
                </div>

                <dl className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="flex justify-between sm:block border-b border-[#141619]/8 pb-2 sm:border-0 sm:pb-0">
                    <dt className="text-[#4C525C]">典藏器型</dt>
                    <dd className="mt-1 font-mono-tech font-medium text-[#141619]">
                      {orderSummary.modelCode}
                    </dd>
                  </div>
                  <div className="flex justify-between sm:block border-b border-[#141619]/8 pb-2 sm:border-0 sm:pb-0">
                    <dt className="text-[#4C525C]">淬面工艺</dt>
                    <dd className="mt-1 font-medium text-[#141619]">
                      {orderSummary.material.name}
                    </dd>
                  </div>
                  <div className="flex justify-between sm:block border-b border-[#141619]/8 pb-2 sm:border-0 sm:pb-0">
                    <dt className="text-[#4C525C]">笔夹背面刻字</dt>
                    <dd className="mt-1 font-mono-tech font-medium text-[#9C6226]">
                      {orderSummary.hasEngraving ? orderSummary.engraving : '无（素面出厂）'}
                    </dd>
                  </div>
                  <div className="flex justify-between sm:block">
                    <dt className="text-[#4C525C]">交付周期</dt>
                    <dd className="mt-1 font-medium text-[#141619]">
                      {orderSummary.estimatedDispatch}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-center justify-between border-t border-[#141619]/10 pt-4">
                  <span className="text-xs text-[#4C525C]">
                    典藏总额（含顺丰保价与激光阴刻）
                  </span>
                  <span className="font-mono-tech text-xl font-medium text-[#141619] tabular-nums">
                    ¥ {orderSummary.totalCny.toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
