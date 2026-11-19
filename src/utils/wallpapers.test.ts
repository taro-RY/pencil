import test from 'node:test';
import assert from 'node:assert/strict';
import { WALLPAPER_PRESETS, getWallpaperPreset } from './wallpapers';

test('WALLPAPER_PRESETS provides both dynamic and 4K static bright daylight wallpapers', () => {
  const dynamicList = WALLPAPER_PRESETS.filter((w) => w.kind === 'dynamic');
  const staticList = WALLPAPER_PRESETS.filter((w) => w.kind === 'static');

  assert.ok(dynamicList.length >= 3);
  assert.ok(staticList.length >= 3);

  for (const s of staticList) {
    assert.ok(s.imageUrl && s.imageUrl.includes('w=3840'), `Expected 4K URL on ${s.id}`);
  }

  assert.equal(getWallpaperPreset('coastal-daylight').kind, 'dynamic');
  assert.equal(getWallpaperPreset('unsplash-coastal').kind, 'static');
});
