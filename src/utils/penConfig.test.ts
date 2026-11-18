import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLODED_PARTS,
  MATERIAL_LIST,
  MAX_ENGRAVING_LENGTH,
  buildOrderSummary,
  computeExplodedOffsets,
  computeInkWidth,
  validateEngraving,
} from './penConfig';

test('material catalog contains 3 distinct finishes with valid prices', () => {
  assert.equal(MATERIAL_LIST.length, 3);
  for (const mat of MATERIAL_LIST) {
    assert.ok(mat.priceCny >= 1000);
    assert.ok(mat.pbr.metalness > 0.5);
  }
});

test('exploded view has exactly 7 precision parts and zero offset when assembled', () => {
  assert.equal(EXPLODED_PARTS.length, 7);
  const assembled = computeExplodedOffsets(0);
  for (const part of EXPLODED_PARTS) {
    assert.equal(assembled[part.id].axial, 0);
    assert.equal(assembled[part.id].radialX, 0);
    assert.equal(assembled[part.id].radialZ, 0);
  }
});

test('exploded offsets increase monotonically from cap (+axial) to tip (-axial)', () => {
  const exploded = computeExplodedOffsets(1);
  assert.ok(exploded.cap.axial > exploded.ratchet.axial);
  assert.ok(exploded.ratchet.axial > exploded.clip.axial);
  assert.ok(exploded.clip.axial > exploded.sleeve.axial);
  assert.ok(exploded.sleeve.axial > exploded.barrel.axial);
  assert.ok(exploded.barrel.axial > exploded.refill.axial);
  assert.ok(exploded.refill.axial > exploded.tip.axial);
  assert.ok(exploded.clip.radialX > 0);
});

test('computeExplodedOffsets clamps out-of-range progress safely', () => {
  const below = computeExplodedOffsets(-0.5);
  const above = computeExplodedOffsets(1.8);
  assert.equal(below.cap.axial, 0);
  assert.equal(above.cap.axial, EXPLODED_PARTS[0].explodedOffsetAxial);
});

test('validateEngraving clamps to 8 characters and strips control chars', () => {
  const res = validateEngraving('M01\nLAB-2026-EXTRA');
  assert.equal(res.length, MAX_ENGRAVING_LENGTH);
  assert.equal(res.sanitized, 'M01LAB-2');
  assert.equal(res.remaining, 0);

  const cjk = validateEngraving('工坊精密制造限定版本');
  assert.equal(cjk.length, 8);
  assert.equal(cjk.sanitized, '工坊精密制造限定');
});

test('computeInkWidth responds realistically to velocity', () => {
  const slow = computeInkWidth(0.05);
  const fast = computeInkWidth(2.4);
  assert.ok(slow.strokePx > fast.strokePx);
  assert.ok(slow.apparentMm >= 0.38);
  assert.ok(fast.apparentMm < slow.apparentMm);
});

test('buildOrderSummary produces deterministic confirmation with complimentary engraving', () => {
  const fixedDate = new Date('2026-11-17T08:30:00Z');
  const order = buildOrderSummary('brushed-brass', 'M01-ALEX', fixedDate);
  assert.equal(order.material.id, 'brushed-brass');
  assert.equal(order.unitPriceCny, 1680);
  assert.equal(order.engravingFeeCny, 0);
  assert.equal(order.totalCny, 1680);
  assert.equal(order.hasEngraving, true);
  assert.equal(order.engraving, 'M01-ALEX');
  assert.match(order.orderNumber, /^M01-261117-\d{4}$/);
});
