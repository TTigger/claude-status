const test = require('node:test');
const assert = require('node:assert');
const { DEFAULT_CONFIG } = require('../src/defaults');
const { CONFIG_SCHEMA } = require('../src/registry');

test('default config matches spec', () => {
  assert.strictEqual(DEFAULT_CONFIG.style, 'claude');
  assert.strictEqual(DEFAULT_CONFIG.layout, 'auto');
  assert.strictEqual(DEFAULT_CONFIG.barWidth, 8);
  assert.deepStrictEqual(DEFAULT_CONFIG.colorThresholds, { green: 50, yellow: 80 });
  assert.strictEqual(DEFAULT_CONFIG.elements.weekly, true);
  assert.strictEqual(DEFAULT_CONFIG.autoCompact.thresholdPct, 83.5);
  assert.strictEqual(DEFAULT_CONFIG.refreshIntervalSec, 30);
});

test('DEFAULT_CONFIG.elements.cost defaults to true', () => {
  assert.strictEqual(DEFAULT_CONFIG.elements.cost, true);
});

test('default style is claude', () => {
  assert.strictEqual(DEFAULT_CONFIG.style, 'claude');
});

test('style schema offers exactly the 4 styles', () => {
  assert.deepStrictEqual([...CONFIG_SCHEMA.style.choices].sort(), ['ascii', 'claude', 'mist', 'neon']);
});
