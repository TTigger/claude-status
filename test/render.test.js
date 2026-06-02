const test = require('node:test');
const assert = require('node:assert');
const { renderHud } = require('../src/render');
const { stripAnsi } = require('../src/format');
const { DEFAULT_CONFIG } = require('../src/defaults');
const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');

const base = {
  stdin: SAMPLE, theme: 'dark',
  caps: { unicode: true, color256: true, truecolor: true, nerd: false },
  columns: 200, now: SAMPLE_NOW, branch: 'main',
};

test('default (claude/auto) renders single line with all segments', () => {
  const out = renderHud({ ...base, config: DEFAULT_CONFIG });
  const plain = stripAnsi(out);
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(plain.includes('Opus 4.8·1M'));
  assert.ok(plain.includes('claude-status'));
  assert.ok(plain.includes('main'));
  assert.ok(plain.includes('24%'));
  assert.ok(plain.includes('52%'));
  assert.ok(plain.includes('31%'));
});

test('no rate_limits => session/weekly replaced by waiting note', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const out = stripAnsi(renderHud({ ...base, stdin, config: DEFAULT_CONFIG }));
  assert.ok(out.includes('waiting for first message'));
});

test('three layout yields 3 lines', () => {
  const out = renderHud({ ...base, config: { ...DEFAULT_CONFIG, layout: 'three' } });
  assert.strictEqual(out.split('\n').length, 3);
});

const { STYLES } = require('../src/registry');
test('every registry style renders without throwing', () => {
  for (const s of STYLES) {
    const out = renderHud({ ...base, config: { ...DEFAULT_CONFIG, style: s.name } });
    assert.ok(typeof out === 'string' && out.length > 0, `style ${s.name} empty`);
  }
});
