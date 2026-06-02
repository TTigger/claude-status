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

const { bar } = require('../src/format');

test('bar fills proportionally with given glyphs', () => {
  assert.strictEqual(bar(23, 8, { full: '#', empty: '-' }), '##------');
  assert.strictEqual(bar(0, 4, { full: '#', empty: '-' }), '----');
  assert.strictEqual(bar(100, 4, { full: '#', empty: '-' }), '####');
  assert.strictEqual(bar(50, 8, { full: '#', empty: '-' }), '####----');
});

const { humanizeDuration, tokensK } = require('../src/format');

test('humanizeDuration shows up to two units', () => {
  assert.strictEqual(humanizeDuration(3 * 3600 + 12 * 60), '3h12m');
  assert.strictEqual(humanizeDuration(4 * 86400 + 6 * 3600), '4d6h');
  assert.strictEqual(humanizeDuration(12 * 60), '12m');
  assert.strictEqual(humanizeDuration(30), '<1m');
  assert.strictEqual(humanizeDuration(-10), '0m');
});

test('tokensK formats thousands', () => {
  assert.strictEqual(tokensK(47000), '47k');
  assert.strictEqual(tokensK(47000, true), '47.0k');
  assert.strictEqual(tokensK(0), '0k');
});
