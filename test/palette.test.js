const test = require('node:test');
const assert = require('node:assert');
const { resolvePalette, colorize } = require('../src/palette');

const caps256 = { color256: true, truecolor: false };
const caps8 = { color256: false, truecolor: false };

test('traffic light uses 256-color dark-ish codes', () => {
  const p = resolvePalette('traffic', 'light', caps256);
  assert.strictEqual(p.low, '\x1b[38;5;28m');
  assert.strictEqual(p.mid, '\x1b[38;5;166m');
  assert.strictEqual(p.high, '\x1b[38;5;160m');
  assert.strictEqual(p.reset, '\x1b[0m');
});

test('traffic falls back to 8-color when 256 unsupported', () => {
  const p = resolvePalette('traffic', 'dark', caps8);
  assert.strictEqual(p.low, '\x1b[32m');
  assert.strictEqual(p.mid, '\x1b[33m');
  assert.strictEqual(p.high, '\x1b[31m');
});

test('coral mode uses coral gradient regardless of theme', () => {
  const p = resolvePalette('coral', 'light', caps256);
  assert.strictEqual(p.low, '\x1b[38;5;216m');
  assert.strictEqual(p.mid, '\x1b[38;5;173m');
  assert.strictEqual(p.high, '\x1b[38;5;167m');
});

test('colorize wraps text with tier color + reset', () => {
  const p = resolvePalette('traffic', 'dark', caps256);
  assert.strictEqual(colorize('x', 'low', p), '\x1b[38;5;40mx\x1b[0m');
});
