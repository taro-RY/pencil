import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOWER_STYLE_LIST,
  FLOWER_STYLE_MAP,
  drawBotanicalSprout,
} from './paperBotanicals';

test('FLOWER_STYLE_LIST includes plum, blueAster, chrysanthemum, lilyBell, wisteria, and meadow', () => {
  const ids = FLOWER_STYLE_LIST.map((s) => s.id);
  assert.deepEqual(ids, [
    'plum',
    'blueAster',
    'chrysanthemum',
    'lilyBell',
    'wisteria',
    'meadow',
  ]);
  for (const id of ids) {
    assert.ok(FLOWER_STYLE_MAP[id].name.length > 0);
    assert.ok(FLOWER_STYLE_MAP[id].swatchHex.startsWith('#'));
  }
});

test('drawBotanicalSprout executes cleanly across all 6 flower styles', () => {
  const calls: string[] = [];
  const noop = () => {};
  const gradStub = { addColorStop: noop };
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: noop,
    rotate: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    ellipse: noop,
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    createRadialGradient: () => gradStub,
    createLinearGradient: () => gradStub,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
  } as unknown as CanvasRenderingContext2D;

  for (const style of FLOWER_STYLE_LIST) {
    calls.length = 0;
    for (let i = 0; i < 6; i++) {
      drawBotanicalSprout(mockCtx, style.id, 40 + i * 23, 80 + i * 17, 0.4, 10 + i * 7);
    }
    const saves = calls.filter((c) => c === 'save').length;
    const restores = calls.filter((c) => c === 'restore').length;
    assert.equal(saves, restores);
    assert.ok(calls.includes('fill') || calls.includes('stroke'));
  }
});
