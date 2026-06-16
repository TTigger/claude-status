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

test('no rate_limits + cost on (default) => shows cost estimate, not waiting note', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const out = stripAnsi(renderHud({ ...base, stdin, config: DEFAULT_CONFIG }));
  assert.ok(out.includes('est'), 'shows est marker');
  assert.ok(out.includes('$'), 'shows dollar amount');
  assert.ok(!out.includes('waiting for first message'), 'no waiting note when cost shown');
});

test('no rate_limits + cost off => waiting note returns', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const cfg = { ...DEFAULT_CONFIG, elements: { ...DEFAULT_CONFIG.elements, cost: false } };
  const out = stripAnsi(renderHud({ ...base, stdin, config: cfg }));
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

function run(style, caps) {
  return renderHud({ stdin: SAMPLE, config: { ...DEFAULT_CONFIG, style, layout: 'oneline' },
    theme: 'dark', caps, columns: 200, now: SAMPLE_NOW, branch: 'main' });
}
test('mist renders pill background codes when color256', () => {
  assert.match(run('mist', { unicode:true, color256:true }), /\x1b\[48;5;\d+m/);
});
test('mist drops backgrounds when terminal has no color', () => {
  assert.doesNotMatch(run('mist', { unicode:true }), /\x1b\[48/);
});
test('claude (Clay) renders without any background code', () => {
  assert.doesNotMatch(run('claude', { unicode:true, truecolor:true }), /\x1b\[48/);
});
test('neon falls back to rounded blocks without nerd (no powerline glyph)', () => {
  const out = run('neon', { unicode:true, color256:true });
  assert.ok(!out.includes('') && !out.includes(''));
  assert.match(out, /\x1b\[48;5;\d+m/);
});
