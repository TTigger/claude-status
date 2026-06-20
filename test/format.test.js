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

test('bar (integer path) splits into fill/empty proportionally', () => {
  assert.deepStrictEqual(bar(23, 8, { full: '#', empty: '-' }, false), { fill: '##', empty: '------' });
  assert.deepStrictEqual(bar(0, 4, { full: '#', empty: '-' }, false), { fill: '', empty: '----' });
  assert.deepStrictEqual(bar(100, 4, { full: '#', empty: '-' }, false), { fill: '####', empty: '' });
  assert.deepStrictEqual(bar(50, 8, { full: '#', empty: '-' }, false), { fill: '####', empty: '----' });
});

test('bar (sub-cell path) resolves to 64 levels so 47/50/52 differ', () => {
  const g = { full: '█', empty: '█' };
  assert.strictEqual(bar(47, 8, g, true).fill, '███▊');
  assert.strictEqual(bar(50, 8, g, true).fill, '████');
  assert.strictEqual(bar(52, 8, g, true).fill, '████▏');
  // empty fills the remaining cells (boundary cell counts as used)
  assert.strictEqual(bar(47, 8, g, true).empty, '████');
  assert.strictEqual(bar(50, 8, g, true).empty, '████');
  assert.strictEqual(bar(52, 8, g, true).empty, '███');
  // exact 0% / 100%
  assert.deepStrictEqual(bar(0, 8, g, true), { fill: '', empty: '████████' });
  assert.deepStrictEqual(bar(100, 8, g, true), { fill: '████████', empty: '' });
});

const { darken } = require('../src/format');
test('darken multiplies channels and clamps', () => {
  assert.strictEqual(darken('#d97757', 0.30), '#41241a'); // 217,119,87 -> 65,36,26
  assert.strictEqual(darken('#bb9af7', 0.50), '#5e4d7c'); // 187,154,247 -> 94,77,124
  assert.strictEqual(darken('#ffffff', 0), '#000000');
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
