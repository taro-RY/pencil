export type WallpaperKind = 'dynamic' | 'static';

export type WallpaperId =
  | 'coastal-daylight'
  | 'xuan-morning'
  | 'sakura-breeze'
  | 'unsplash-coastal'
  | 'unsplash-sakura-sky'
  | 'unsplash-fuji-sakura'
  | 'custom-local';

export interface WallpaperSpec {
  id: WallpaperId;
  name: string;
  kind: WallpaperKind;
  subtitle: string;
  swatchHex: string;
  fallbackBgHex: string;
  imageUrl?: string;
}

export const WALLPAPER_PRESETS: WallpaperSpec[] = [
  {
    id: 'coastal-daylight',
    name: '碧海晴云',
    kind: 'dynamic',
    subtitle: '晴空海风与流云动态光影（参考同款亮色氛围）',
    swatchHex: '#69C5C8',
    fallbackBgHex: '#D8EFEF',
  },
  {
    id: 'xuan-morning',
    name: '暖宣晨光',
    kind: 'dynamic',
    subtitle: '美术馆棉浆纸色与柔风浮云动态',
    swatchHex: '#EDE6D8',
    fallbackBgHex: '#F3EFE6',
  },
  {
    id: 'sakura-breeze',
    name: '晴空樱岚',
    kind: 'dynamic',
    subtitle: '澄澈天青与浅绯春云动态微风',
    swatchHex: '#B8DFF2',
    fallbackBgHex: '#E9F4FA',
  },
  {
    id: 'unsplash-coastal',
    name: '4K 白沙碧海',
    kind: 'static',
    subtitle: '4K 高清晴朗热带浅海与流云摄影',
    swatchHex: '#4DB8C4',
    fallbackBgHex: '#CFECEF',
    imageUrl:
      'https://images.unsplash.com/photo-1757262229144-f1913607ad6e?auto=format&fit=crop&w=3840&q=85',
  },
  {
    id: 'unsplash-sakura-sky',
    name: '4K 晴空樱花',
    kind: 'static',
    subtitle: '4K 高清蓝天映衬春樱实景摄影',
    swatchHex: '#8CC4EC',
    fallbackBgHex: '#E6F0F8',
    imageUrl:
      'https://images.unsplash.com/photo-1522518961115-07c922089dd4?auto=format&fit=crop&w=3840&q=85',
  },
  {
    id: 'unsplash-fuji-sakura',
    name: '4K 雪山晴樱',
    kind: 'static',
    subtitle: '4K 高清晴日远山与樱枝全景摄影',
    swatchHex: '#D6D9E6',
    fallbackBgHex: '#EBEEF5',
    imageUrl:
      'https://images.unsplash.com/photo-1791515018079-164f76666161?auto=format&fit=crop&w=3840&q=85',
  },
];

export function getWallpaperPreset(id: WallpaperId): WallpaperSpec {
  return WALLPAPER_PRESETS.find((w) => w.id === id) ?? WALLPAPER_PRESETS[0];
}
