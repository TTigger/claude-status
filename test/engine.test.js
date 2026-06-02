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

const { buildParts } = require('../src/engine');
const { buildElements } = require('../src/elements');
const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('buildParts produces env+context+limits segments for full sample (ascii)', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  const byKey = Object.fromEntries(parts.map(p => [p.key, stripAnsi(p.text)]));
  assert.strictEqual(byKey.model, 'Opus 4.8·1M');
  assert.strictEqual(byKey.project, 'claude-status');
  assert.strictEqual(byKey.branch, 'main');
  assert.strictEqual(byKey.context, 'Ctx [##------] 24% 47k');
  assert.strictEqual(byKey.autoCompact, 'compact 60%');
  assert.strictEqual(byKey.session, 'Ses [####----] 52% 3h12m');
  assert.strictEqual(byKey.weekly, 'Wk [##------] 31% 4d6h');
});

test('buildParts does not double-tag 1M when display_name already says so', () => {
  // Real Claude Code sends display_name like "Opus 4.8 (1M context)";
  // appending another ·1M would duplicate it.
  const mk = (name) => {
    const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
    els.model = { name, context1m: true };
    const parts = buildParts({
      els, style: styleByName('ascii'), palette,
      config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
      opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
    });
    return stripAnsi(parts.find((p) => p.key === 'model').text);
  };
  assert.strictEqual(mk('Opus 4.8 (1M context)'), 'Opus 4.8 (1M context)'); // no extra ·1M
  assert.strictEqual(mk('Opus 4.8'), 'Opus 4.8·1M');                        // still tagged when absent
});

test('buildParts drops tokens/autocompact when opts disable them', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: false, includeAutoCompact: false, resetPrecision: 'short', bars: false },
  });
  const keys = parts.map(p => p.key);
  assert.ok(!keys.includes('autoCompact'));
  const ctx = parts.find(p => p.key === 'context');
  assert.strictEqual(stripAnsi(ctx.text), 'Ctx 24%'); // no bar, no tokens
});
