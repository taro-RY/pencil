import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { FluidSilkBackdrop } from './components/FluidSilkBackdrop';
import { HeroExplodedStage } from './components/HeroExplodedStage';
import { FeelLabSection } from './components/FeelLabSection';
import { BotanicalCanvasStudio } from './components/BotanicalCanvasStudio';
import { SpecsSection } from './components/SpecsSection';
import { OrderSection } from './components/OrderSection';
import { MaterialId } from './utils/penConfig';
import { WallpaperId } from './utils/wallpapers';

export default function App() {
  const [materialId, setMaterialId] = useState<MaterialId>('raw-titanium');
  const [engravingText, setEngravingText] = useState('');
  const [studioFullscreenToken, setStudioFullscreenToken] = useState(0);
  const [isStudioFullscreen, setIsStudioFullscreen] = useState(false);

  const [wallpaperId, setWallpaperId] = useState<WallpaperId>('coastal-daylight');
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);
  const [customWallpaperName, setCustomWallpaperName] = useState<string>('');

  useEffect(() => {
    return () => {
      if (customWallpaperUrl) {
        URL.revokeObjectURL(customWallpaperUrl);
      }
    };
  }, [customWallpaperUrl]);

  const handleUploadWallpaper = (file: File) => {
    if (customWallpaperUrl) {
      URL.revokeObjectURL(customWallpaperUrl);
    }
    const url = URL.createObjectURL(file);
    setCustomWallpaperUrl(url);
    setCustomWallpaperName(file.name);
    setWallpaperId('custom-local');
  };

  return (
    <div className="relative min-h-screen bg-transparent text-[#141619]">
      <FluidSilkBackdrop
        wallpaperId={wallpaperId}
        customWallpaperUrl={customWallpaperUrl}
      />
      {!isStudioFullscreen && (
        <Navbar
          wallpaperId={wallpaperId}
          customWallpaperName={customWallpaperName}
          onSelectWallpaper={setWallpaperId}
          onUploadWallpaper={handleUploadWallpaper}
        />
      )}

      <main className="relative">
        <HeroExplodedStage
          materialId={materialId}
          engravingText={engravingText}
        />

        <FeelLabSection
          materialId={materialId}
          onSelectMaterial={setMaterialId}
          engravingText={engravingText}
          onOpenStudioFullscreen={() => setStudioFullscreenToken((n) => n + 1)}
        />

        <BotanicalCanvasStudio
          externalFullscreenTrigger={studioFullscreenToken}
          onFullscreenChange={setIsStudioFullscreen}
        />

        <SpecsSection />

        <OrderSection
          materialId={materialId}
          onSelectMaterial={setMaterialId}
          engravingText={engravingText}
          onEngravingChange={setEngravingText}
        />
      </main>

      <footer className="relative z-10 border-t border-[#141619]/10 bg-[#FAF8F4]/72 backdrop-blur-md py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 text-xs text-[#4C525C] sm:flex-row sm:items-center sm:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <span className="font-mono-tech text-[#141619] font-medium">M-01</span>
            <span aria-hidden="true">·</span>
            <span>Ti-6Al-4V 精密书写工具工坊</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#structure" className="hover:text-[#141619] transition-colors">
              结构
            </a>
            <a href="#feel" className="hover:text-[#141619] transition-colors">
              手感
            </a>
            <a href="#studio" className="hover:text-[#141619] transition-colors">
              画室
            </a>
            <a href="#specs" className="hover:text-[#141619] transition-colors">
              规格
            </a>
            <a href="#order" className="hover:text-[#141619] transition-colors">
              定制与预订
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
