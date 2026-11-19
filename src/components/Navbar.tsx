import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import { WALLPAPER_PRESETS, WallpaperId } from '../utils/wallpapers';

interface NavbarProps {
  wallpaperId: WallpaperId;
  customWallpaperName?: string;
  onSelectWallpaper: (id: WallpaperId) => void;
  onUploadWallpaper: (file: File) => void;
  onOrderClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wallpaperId,
  customWallpaperName,
  onSelectWallpaper,
  onUploadWallpaper,
  onOrderClick,
}) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const dynamicPresets = WALLPAPER_PRESETS.filter((w) => w.kind === 'dynamic');
  const staticPresets = WALLPAPER_PRESETS.filter((w) => w.kind === 'static');

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-[#141619]/10 bg-[#FAF8F4]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 md:px-10">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a
          href="#top"
          className="font-mono-tech text-base font-medium tracking-[0.18em] text-[#141619] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
        >
          M-01
        </a>

        {/* Zone 2: Clean single-line anchors */}
        <nav
          aria-label="主导航"
          className="hidden sm:flex items-center gap-6 md:gap-10 text-sm text-[#4C525C]"
        >
          <a
            href="#structure"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#141619] focus-visible:outline-none focus-visible:text-[#141619]"
          >
            结构
          </a>
          <a
            href="#feel"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#141619] focus-visible:outline-none focus-visible:text-[#141619]"
          >
            手感
          </a>
          <a
            href="#studio"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#141619] focus-visible:outline-none focus-visible:text-[#141619]"
          >
            画室
          </a>
          <a
            href="#specs"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#141619] focus-visible:outline-none focus-visible:text-[#141619]"
          >
            规格
          </a>
        </nav>

        {/* Zone 3: Wallpaper Switcher + Primary Action */}
        <div className="relative flex items-center gap-2.5 shrink-0" ref={popoverRef}>
          <button
            type="button"
            data-testid="wallpaper-switcher-btn"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 border border-[#141619]/15 bg-white/75 px-3 py-2 text-xs font-medium text-[#141619] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#9C6226] hover:text-[#9C6226] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9C6226]"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[#9C6226]" />
            <span>壁纸</span>
          </button>

          <a
            href="#order"
            onClick={() => onOrderClick?.()}
            className="inline-flex items-center justify-center border border-[#141619] bg-[#141619] px-4 py-2 text-xs font-medium tracking-wide text-[#FAF8F4] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#9C6226] hover:bg-[#9C6226] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9C6226]"
          >
            定制与预订
          </a>

          {open && (
            <div
              role="dialog"
              aria-label="切换网页亮色动态与 4K 静态壁纸"
              data-testid="wallpaper-popover"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[308px] sm:w-[340px] border border-[#141619]/15 bg-[#FAF8F4]/96 p-4 shadow-xl backdrop-blur-md text-[#141619]"
            >
              <div className="mb-3 flex items-center justify-between border-b border-[#141619]/10 pb-2">
                <span className="text-xs font-medium tracking-wide text-[#141619]">
                  亮色空间背景壁纸
                </span>
                <span className="font-mono-tech text-[11px] text-[#4C525C]">
                  动效 / 4K 实景
                </span>
              </div>

              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1.5 font-mono-tech text-[11px] text-[#4C525C]">
                  <Sparkles className="h-3 w-3 text-[#9C6226]" />
                  <span>动态流云壁纸</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {dynamicPresets.map((item) => {
                    const active = item.id === wallpaperId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`wallpaper-opt-${item.id}`}
                        aria-pressed={active}
                        onClick={() => {
                          onSelectWallpaper(item.id);
                          setOpen(false);
                        }}
                        className={`flex items-center gap-3 border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#9C6226] bg-[#9C6226]/10'
                            : 'border-[#141619]/10 bg-white/70 hover:border-[#141619]/30'
                        }`}
                      >
                        <span
                          className="h-6 w-6 shrink-0 border border-[#141619]/15"
                          style={{ backgroundColor: item.swatchHex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#141619]">
                            {item.name}
                          </div>
                          <div className="truncate text-[11px] text-[#4C525C]">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1.5 font-mono-tech text-[11px] text-[#4C525C]">
                  <ImageIcon className="h-3 w-3 text-[#9C6226]" />
                  <span>4K 高清静态摄影</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {staticPresets.map((item) => {
                    const active = item.id === wallpaperId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`wallpaper-opt-${item.id}`}
                        aria-pressed={active}
                        onClick={() => {
                          onSelectWallpaper(item.id);
                          setOpen(false);
                        }}
                        className={`flex items-center gap-3 border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#9C6226] bg-[#9C6226]/10'
                            : 'border-[#141619]/10 bg-white/70 hover:border-[#141619]/30'
                        }`}
                      >
                        <span
                          className="h-6 w-6 shrink-0 border border-[#141619]/15"
                          style={{ backgroundColor: item.swatchHex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#141619]">
                            {item.name}
                          </div>
                          <div className="truncate text-[11px] text-[#4C525C]">
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#141619]/10 pt-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  data-testid="wallpaper-upload-input"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadWallpaper(file);
                      setOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 border border-dashed border-[#141619]/25 bg-white/60 px-3 py-2 text-xs text-[#141619] transition-colors hover:border-[#9C6226] hover:text-[#9C6226]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {wallpaperId === 'custom-local' && customWallpaperName
                      ? `已应用：${customWallpaperName}`
                      : '上传本地 4K 图片 / 动态图'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
