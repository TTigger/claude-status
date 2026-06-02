const test = require('node:test');
const assert = require('node:assert');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('default config matches spec', () => {
  assert.strictEqual(DEFAULT_CONFIG.style, 'claude');
  assert.strictEqual(DEFAULT_CONFIG.layout, 'auto');
  assert.strictEqual(DEFAULT_CONFIG.barWidth, 8);
  assert.deepStrictEqual(DEFAULT_CONFIG.colorThresholds, { green: 50, yellow: 80 });
  assert.strictEqual(DEFAULT_CONFIG.elements.weekly, true);
  assert.strictEqual(DEFAULT_CONFIG.autoCompact.thresholdPct, 83.5);
  assert.strictEqual(DEFAULT_CONFIG.refreshIntervalSec, 30);
});
