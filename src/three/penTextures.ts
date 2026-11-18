import * as THREE from 'three';
import { MaterialId, PEN_MATERIALS } from '../utils/penConfig';

export interface SurfaceTextureSet {
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Generates deterministic procedural grayscale micro-surface maps for
 * bead-blasted titanium, DLC matte carbon, and axial brushed brass.
 */
export function createSurfaceTextureSet(
  kind: 'bead-blasted' | 'dlc-matte' | 'brushed',
  maxAnisotropy: number,
): SurfaceTextureSet {
  const size = 256;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Deterministic PRNG so textures never flicker across rebuilds
  let seed = kind === 'brushed' ? 1337 : kind === 'dlc-matte' ? 4099 : 7919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (kind === 'brushed') {
    rCtx.fillStyle = '#c8c8c8';
    rCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    // Fine circumferential/axial brushed grain lines
    for (let y = 0; y < size; y++) {
      const lum = Math.floor(175 + (rand() - 0.5) * 65);
      rCtx.fillStyle = `rgb(${lum},${lum},${lum})`;
      rCtx.fillRect(0, y, size, 1);

      const bLum = Math.floor(128 + (rand() - 0.5) * 70);
      bCtx.fillStyle = `rgb(${bLum},${bLum},${bLum})`;
      bCtx.fillRect(0, y, size, 1);
    }

    // Subtle micro-scratches along brush direction
    for (let i = 0; i < 180; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const w = Math.floor(24 + rand() * 90);
      const bLum = Math.floor(100 + rand() * 55);
      bCtx.fillStyle = `rgba(${bLum},${bLum},${bLum},0.45)`;
      bCtx.fillRect(x, y, w, 1);
    }
  } else {
    const baseRough = kind === 'dlc-matte' ? 215 : 190;
    const spread = kind === 'dlc-matte' ? 22 : 42;
    const rImg = rCtx.createImageData(size, size);
    const bImg = bCtx.createImageData(size, size);

    for (let i = 0; i < size * size; i++) {
      const n = (rand() + rand() - 1) * 0.5;
      const rVal = Math.max(0, Math.min(255, Math.round(baseRough + n * spread)));
      const bVal = Math.max(0, Math.min(255, Math.round(128 + n * (spread * 1.15))));
      const idx = i * 4;
      rImg.data[idx] = rVal;
      rImg.data[idx + 1] = rVal;
      rImg.data[idx + 2] = rVal;
      rImg.data[idx + 3] = 255;

      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;
    }
    rCtx.putImageData(rImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
  }

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 4);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.colorSpace = THREE.NoColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 4);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.colorSpace = THREE.NoColorSpace;

  return { roughnessMap, bumpMap };
}

/**
 * Generates a crisp laser-engraved texture plate for the back/outer clip surface.
 */
export function createEngravingPlateTexture(
  text: string,
  materialId: MaterialId,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const spec = PEN_MATERIALS[materialId];
  ctx.fillStyle = spec.swatchHex;
  ctx.fillRect(0, 0, width, height);

  // Micro laser-etched sheen lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  const label = text.trim() || 'M-01 · TI-6AL-4V';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = text.trim()
    ? '500 36px "IBM Plex Mono", "PingFang SC", monospace'
    : '400 22px "IBM Plex Mono", monospace';

  // Etched dark inner recess + subtle laser rim highlight
  if (materialId === 'obsidian-matte') {
    ctx.fillStyle = 'rgba(218, 222, 230, 0.72)';
  } else if (materialId === 'brushed-brass') {
    ctx.fillStyle = 'rgba(52, 36, 16, 0.85)';
  } else {
    ctx.fillStyle = 'rgba(28, 30, 34, 0.82)';
  }
  ctx.fillText(label, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow disc texture so studio objects
 * never look disconnected when viewed in studio workbench mode.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
