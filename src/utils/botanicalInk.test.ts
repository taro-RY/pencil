import test from 'node:test';
import assert from 'node:assert/strict';
import {
  awakenFloraNearWorldPoint,
  generateSpringGardenLayout,
  getFloraBloomRatio,
  stepFloraGarden,
} from './botanicalInk';

test('generateSpringGardenLayout builds clean 3D blossom branches without moss clutter', () => {
  const { branches, flora } = generateSpringGardenLayout();
  assert.ok(branches.length >= 8);
  assert.ok(flora.length >= 36);
  assert.equal(getFloraBloomRatio(flora), 0);

  const species = new Set(flora.map((f) => f.kind));
  assert.equal(species.has('cupBlossom'), true);
  assert.equal(species.has('starFlower'), true);
  assert.equal(species.has('daisyFlower'), true);
  assert.equal(species.has('leafBud'), true);
});

test('awakenFloraNearWorldPoint blooms nearby 3D blossoms immediately on first swipe and decays back', () => {
  const { flora } = generateSpringGardenLayout();
  const sample = flora[Math.floor(flora.length * 0.5)];
  const hit = awakenFloraNearWorldPoint(
    flora,
    sample.position.x,
    sample.position.y,
    1.6,
    1.0,
    0.3,
  );
  assert.equal(hit, true);
  assert.ok(sample.vitality >= 0.34);

  for (let i = 0; i < 8; i++) {
    stepFloraGarden(flora, 0.1, 1.0 + i * 0.1, false, 1.5);
  }
  assert.ok(getFloraBloomRatio(flora) > 0);
  assert.equal(sample.vitality, 1);

  for (let i = 0; i < 60; i++) {
    stepFloraGarden(flora, 0.1, 3.0 + i * 0.1, false, 1.5);
  }
  assert.equal(getFloraBloomRatio(flora), 0);
});

test('stepFloraGarden settles cleanly in persistAll mode at 100% bloom', () => {
  const { flora } = generateSpringGardenLayout();
  let active = true;
  for (let i = 0; i < 60; i++) {
    active = stepFloraGarden(flora, 0.1, i * 0.1, true);
  }
  assert.equal(active, false);
  assert.equal(getFloraBloomRatio(flora), 1);
});
