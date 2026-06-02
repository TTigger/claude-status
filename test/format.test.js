const test = require('node:test');
const assert = require('node:assert');
const { clampPct, tier } = require('../src/format');

test('clampPct bounds 0..100 and rounds', () => {
  assert.strictEqual(clampPct(-5), 0);
  assert.strictEqual(clampPct(150), 100);
  assert.strictEqual(clampPct(23.4), 23);
});

test('tier respects thresholds (boundaries inclusive low side)', () => {
  const t = { green: 50, yellow: 80 };
  assert.strictEqual(tier(50, t), 'low');
  assert.strictEqual(tier(51, t), 'mid');
  assert.strictEqual(tier(80, t), 'mid');
  assert.strictEqual(tier(81, t), 'high');
});
