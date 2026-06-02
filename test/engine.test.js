const test = require('node:test');
const assert = require('node:assert');
const { renderMetric } = require('../src/engine');
const { resolvePalette } = require('../src/palette');
const { stripAnsi } = require('../src/format');
const { styleByName } = require('../src/registry');

const style = styleByName('ascii');
const palette = resolvePalette('traffic', 'dark', { color256: false });
const thresholds = { green: 50, yellow: 80 };

test('renderMetric draws label, wrapped bar, percent, suffix', () => {
  const out = renderMetric({
    label: 'Ctx', pct: 23, suffix: '47k',
    style, palette, thresholds, barWidth: 8,
  });
  assert.strictEqual(stripAnsi(out), 'Ctx [##------] 23% 47k');
});

test('renderMetric high tier uses high color code', () => {
  const out = renderMetric({
    label: 'Ctx', pct: 90, suffix: '', style, palette, thresholds, barWidth: 4,
  });
  assert.ok(out.includes('\x1b[31m')); // 8-color red
});
