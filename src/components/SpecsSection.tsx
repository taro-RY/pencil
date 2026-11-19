import React, { useState } from 'react';

const CORE_SPECS = [
  {
    code: 'MASS',
    label: '整笔实测质量',
    value: '28.4',
    unit: 'g',
    detail: '含定制金属笔芯；钛管壁厚经变径切削，保留金属沉稳质感而不致腕部疲劳。',
  },
  {
    code: 'BALANCE',
    label: '黄金重心坐标',
    value: '62.8',
    unit: 'mm',
    detail: '自笔尖起算；内置 C36000 黄铜配重套筒使重心落在虎口前移 4.0mm 处。',
  },
  {
    code: 'TOLERANCE',
    label: '径向锁止公差',
    value: '±0.02',
    unit: 'mm',
    detail: '双锥面抱紧式内膛配合 0.38mm 碳化钨笔尖，按出瞬间完全消除晃动感。',
  },
  {
    code: 'REFILL',
    label: '替换芯与书写规格',
    value: '0.38',
    unit: 'mm / G2',
    detail: '原配 1,200 米油性中性双相墨水金属芯，并完全兼容国际标准派克 G2 规格。',
  },
];

interface FocusZone {
  id: string;
  label: string;
  mmLabel: string;
  tiltDeg: number;
  note: string;
}

const FOCUS_ZONES: FocusZone[] = [
  {
    id: 'tip',
    label: '落笔俯角平衡',
    mmLabel: '0.38 mm 碳化钨笔尖',
    tiltDeg: -3.2,
    note: '前移重心引导笔尖自然贴合纸面，无需手指额外下压即可稳定出墨。',
  },
  {
    id: 'collet',
    label: '±0.02mm 锁止膛',
    mmLabel: '18.4 mm 抱紧锥面',
    tiltDeg: -1.8,
    note: '双锥面弹性锁紧套消除书写瞬间的所有径向虚位与金属杂音。',
  },
  {
    id: 'cg',
    label: '黄金重心 CG',
    mmLabel: '距笔尖 62.8 mm',
    tiltDeg: -1.2,
    note: '内置 C36000 变壁厚黄铜套筒将质量锚定于虎口前方 4.0mm，久写轻盈。',
  },
  {
    id: 'fulcrum',
    label: '虎口支点力矩',
    mmLabel: '距笔尖 66.8 mm',
    tiltDeg: 0,
    note: '以虎口为物理支点，前段微俯力矩与后段钛管惯量达成精妙零疲劳平衡。',
  },
];

export const SpecsSection: React.FC = () => {
  const [activeZoneId, setActiveZoneId] = useState<string>('cg');
  const activeZone =
    FOCUS_ZONES.find((z) => z.id === activeZoneId) ?? FOCUS_ZONES[2];

  return (
    <section
      id="specs"
      className="relative z-10 scroll-mt-16 border-t border-[#141619]/10 bg-[#FAF8F4]/55 backdrop-blur-sm py-24 md:py-32"
      data-testid="specs-section"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        {/* Editorial Heading */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-[#141619]/10 pb-8">
          <div>
            <p className="font-mono-tech text-xs tracking-widest text-[#9C6226]">
              03. 尺度 · 平衡之诗
            </p>
            <h2
              className="mt-2 font-editorial text-3xl md:text-5xl font-medium tracking-tight text-[#141619]"
              style={{ textWrap: 'balance' }}
            >
              像校正一枚机芯一样校正笔身配重。
            </h2>
          </div>
          <p className="font-mono-tech text-xs text-[#4C525C] tabular-nums">
            全长 142.0 mm · 握径 Ø 9.8 mm · 12° 笔夹倒角
          </p>
        </div>

        {/* Interactive Kinetic Equilibrium & Cross-Section Blueprint */}
        <div className="mt-12 border border-[#141619]/12 bg-[#FAF8F4]/84 backdrop-blur-md p-6 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-mono-tech text-xs font-medium tracking-wider text-[#141619]">
                M-01 纵向剖面与力学支点交互图 (单位: MM)
              </span>
              <p className="mt-1 text-xs text-[#4C525C]">{activeZone.note}</p>
            </div>
            <span className="font-mono-tech text-xs font-medium text-[#9C6226] tabular-nums">
              倾角 {activeZone.tiltDeg.toFixed(1)}° · 重心较虎口前移 4.0 mm
            </span>
          </div>

          {/* Interactive Equilibrium Zone Selectors */}
          <div className="mb-6 flex flex-wrap gap-2">
            {FOCUS_ZONES.map((zone) => {
              const active = zone.id === activeZoneId;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setActiveZoneId(zone.id)}
                  onMouseEnter={() => setActiveZoneId(zone.id)}
                  aria-pressed={active}
                  className={`border px-3 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226] ${
                    active
                      ? 'border-[#9C6226] bg-[#9C6226]/12 text-[#141619] font-medium'
                      : 'border-[#141619]/12 bg-white/75 text-[#4C525C] hover:border-[#141619]/35 hover:text-[#141619]'
                  }`}
                >
                  <span className="font-medium mr-2">{zone.label}</span>
                  <span className="font-mono-tech text-[11px] opacity-80">
                    {zone.mmLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 1000 270"
              className="w-full min-w-[640px] h-auto"
              role="img"
              aria-label="M-01 钛金属签字笔纵向剖面与重心坐标工程图"
            >
              <defs>
                <pattern
                  id="draft-grid"
                  width="25"
                  height="25"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 25 0 L 0 0 0 25"
                    fill="none"
                    stroke="rgba(20,22,25,0.06)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="1000" height="270" fill="url(#draft-grid)" />

              {/* Stationary Fulcrum Triangle at 66.8mm (x=476) */}
              <polygon
                points="476,162 466,184 486,184"
                fill={activeZoneId === 'fulcrum' ? '#9C6226' : 'rgba(20,22,25,0.42)'}
              />
              <line
                x1="476"
                y1="162"
                x2="476"
                y2="214"
                stroke="rgba(20,22,25,0.42)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Tilting Pen Assembly pivoted cleanly around thumb fulcrum (476, 130) */}
              <g
                style={{
                  transform: `rotate(${activeZone.tiltDeg}deg)`,
                  transformOrigin: '476px 130px',
                  transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Center Axial Line */}
                <line
                  x1="40"
                  y1="130"
                  x2="960"
                  y2="130"
                  stroke="rgba(156,98,38,0.45)"
                  strokeDasharray="6 4"
                  strokeWidth="1"
                />

                {/* 0.38mm Tungsten Tip */}
                <polygon
                  points="95,130 128,125 128,135"
                  fill={activeZoneId === 'tip' ? '#9C6226' : '#141619'}
                />
                {/* Nose Cone */}
                <polygon
                  points="128,125 245,104 245,156 128,135"
                  fill={activeZoneId === 'tip' ? 'rgba(156,98,38,0.14)' : 'none'}
                  stroke={activeZoneId === 'tip' ? '#9C6226' : '#1C2026'}
                  strokeWidth="1.4"
                />
                {/* Zero-Play Internal Collet */}
                <rect
                  x="136"
                  y="123"
                  width="36"
                  height="14"
                  fill={
                    activeZoneId === 'collet'
                      ? 'rgba(156,98,38,0.35)'
                      : 'rgba(156,98,38,0.16)'
                  }
                  stroke="#9C6226"
                  strokeWidth={activeZoneId === 'collet' ? '1.8' : '1'}
                />

                {/* Monobloc Barrel */}
                <rect
                  x="245"
                  y="104"
                  width="600"
                  height="52"
                  fill="rgba(20,22,25,0.03)"
                  stroke="#1C2026"
                  strokeWidth="1.4"
                />

                {/* Micro Grip Grooves */}
                {Array.from({ length: 16 }).map((_, idx) => {
                  const gx = 264 + idx * 7.5;
                  return (
                    <line
                      key={idx}
                      x1={gx}
                      y1="104"
                      x2={gx}
                      y2="156"
                      stroke="rgba(20,22,25,0.28)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Internal C36000 Brass Balance Sleeve */}
                <rect
                  x="360"
                  y="111"
                  width="245"
                  height="38"
                  fill={
                    activeZoneId === 'cg'
                      ? 'rgba(156,98,38,0.28)'
                      : 'rgba(156,98,38,0.14)'
                  }
                  stroke="#9C6226"
                  strokeWidth={activeZoneId === 'cg' ? '1.8' : '1.2'}
                />

                {/* Custom Refill Tube */}
                <rect
                  x="172"
                  y="122"
                  width="540"
                  height="16"
                  fill="rgba(20,22,25,0.08)"
                  stroke="rgba(20,22,25,0.52)"
                  strokeWidth="1"
                />

                {/* Dual-Stage Metal Ratchet */}
                <rect
                  x="715"
                  y="115"
                  width="115"
                  height="30"
                  fill="rgba(20,22,25,0.06)"
                  stroke="#4C525C"
                  strokeWidth="1.1"
                />

                {/* Clip */}
                <polygon
                  points="640,94 840,94 845,104 652,104"
                  fill="rgba(20,22,25,0.12)"
                  stroke="#1C2026"
                  strokeWidth="1.2"
                />

                {/* Click Cap */}
                <rect
                  x="845"
                  y="110"
                  width="60"
                  height="40"
                  fill="rgba(20,22,25,0.10)"
                  stroke="#1C2026"
                  strokeWidth="1.4"
                />

                {/* Center of Gravity Marker: 62.8mm from tip -> x=453 */}
                <line
                  x1="453"
                  y1="52"
                  x2="453"
                  y2="206"
                  stroke="#9C6226"
                  strokeWidth="1.6"
                />
                <circle cx="453" cy="130" r="6" fill="#FAF8F4" stroke="#9C6226" strokeWidth="2" />
                <circle cx="453" cy="130" r="2.2" fill="#9C6226" />

                <text
                  x="453"
                  y="40"
                  textAnchor="middle"
                  fill="#9C6226"
                  fontSize="12"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  CG 重心 62.8 mm (虎口前移 4.0 mm)
                </text>

                <text
                  x="154"
                  y="84"
                  textAnchor="middle"
                  fill="#141619"
                  fontSize="11"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  ±0.02 mm 零虚位抱紧
                </text>
                <line
                  x1="154"
                  y1="90"
                  x2="154"
                  y2="120"
                  stroke="rgba(20,22,25,0.38)"
                  strokeWidth="1"
                />
              </g>

              <text
                x="482"
                y="228"
                textAnchor="middle"
                fill="#4C525C"
                fontSize="11"
                fontFamily="IBM Plex Mono, monospace"
              >
                内置 C36000 黄铜配重套筒 · 握持支点 (66.8 mm)
              </text>

              {/* Overall 142.0 mm dimension bar */}
              <line x1="95" y1="248" x2="905" y2="248" stroke="rgba(20,22,25,0.22)" strokeWidth="1" />
              <line x1="95" y1="242" x2="95" y2="254" stroke="rgba(20,22,25,0.35)" strokeWidth="1" />
              <line x1="905" y1="242" x2="905" y2="254" stroke="rgba(20,22,25,0.35)" strokeWidth="1" />
              <rect x="438" y="238" width="124" height="20" fill="#F5F2EB" />
              <text
                x="500"
                y="252"
                textAnchor="middle"
                fill="#141619"
                fontSize="11"
                fontFamily="IBM Plex Mono, monospace"
              >
                142.0 mm 总长
              </text>
            </svg>
          </div>
        </div>

        {/* Borderless Museum-Placard Precision Metrics */}
        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[#141619]/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_SPECS.map((item) => (
            <div key={item.code} className="flex flex-col justify-between">
              <div>
                <p className="font-mono-tech text-[11px] tracking-widest text-[#4C525C]">
                  {item.label}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-editorial text-4xl md:text-5xl font-medium tracking-tight text-[#141619] tabular-nums">
                    {item.value}
                  </span>
                  <span className="font-mono-tech text-sm font-medium text-[#9C6226]">
                    {item.unit}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#4C525C]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
