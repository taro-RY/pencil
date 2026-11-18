import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StudioStroke,
  clearStudioWithUndo,
  commitStudioStroke,
  createStudioHistory,
  redoStudioHistory,
  undoStudioHistory,
} from './canvasStudio';

function makeStroke(id: number): StudioStroke {
  return {
    id,
    tool: 'poetic',
    flowerStyle: 'blueAster',
    inkHex: '#141413',
    nibScale: 1,
    points: [
      { nx: 0.1, ny: 0.2, widthPx: 1.8 },
      { nx: 0.4, ny: 0.25, widthPx: 1.5 },
    ],
    sprouts: [{ nx: 0.3, ny: 0.23, angle: 0.1, seed: id * 17 }],
  };
}

test('studio history supports commit, Ctrl+Z undo, Ctrl+Y redo, and undoable clear', () => {
  let h = createStudioHistory();
  assert.equal(h.present.length, 0);

  h = commitStudioStroke(h, makeStroke(1));
  h = commitStudioStroke(h, makeStroke(2));
  assert.equal(h.present.length, 2);
  assert.equal(h.past.length, 2);

  // Undo second stroke
  h = undoStudioHistory(h);
  assert.equal(h.present.length, 1);
  assert.equal(h.present[0].id, 1);
  assert.equal(h.future.length, 1);

  // Redo second stroke
  h = redoStudioHistory(h);
  assert.equal(h.present.length, 2);
  assert.equal(h.future.length, 0);

  // Clear is also undoable via Ctrl+Z
  h = clearStudioWithUndo(h);
  assert.equal(h.present.length, 0);
  h = undoStudioHistory(h);
  assert.equal(h.present.length, 2);

  // New stroke after undo clears redo future stack
  h = undoStudioHistory(h);
  assert.equal(h.future.length, 2);
  h = commitStudioStroke(h, makeStroke(3));
  assert.equal(h.future.length, 0);
  assert.equal(h.present.map((s) => s.id).join(','), '1,3');
});

test('commitStudioStroke ignores empty strokes and bounds max undo steps', () => {
  let h = createStudioHistory();
  h = commitStudioStroke(h, {
    id: 99,
    tool: 'pure',
    flowerStyle: 'plum',
    inkHex: '#141413',
    nibScale: 1,
    points: [],
    sprouts: [],
  });
  assert.equal(h.present.length, 0);

  for (let i = 1; i <= 5; i++) {
    h = commitStudioStroke(h, makeStroke(i), 3);
  }
  assert.equal(h.past.length, 3);
  assert.equal(h.present.length, 5);
});
