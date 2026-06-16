const test = require('node:test');
const assert = require('node:assert');
const P = require('../src/palette');
const { colorize } = P;

const caps256 = { color256: true, truecolor: false };

test('colorize wraps text with tier color + reset', () => {
  const pal = { low: '\x1b[38;5;40m', fgReset: '\x1b[39m' };
  assert.strictEqual(colorize('x', 'low', pal), '\x1b[38;5;40mx\x1b[39m');
});

test('fgCode emits truecolor when caps.truecolor', () => {
  assert.strictEqual(P.fgCode('#d97757', { truecolor: true }), '\x1b[38;2;217;119;87m');
});
test('fgCode emits 256 when only color256', () => {
  assert.strictEqual(P.fgCode('#ffffff', { color256: true }), '\x1b[38;5;231m');
});
test('fgCode emits empty string when no color caps', () => {
  assert.strictEqual(P.fgCode('#d97757', {}), '');
});
test('bgCode emits truecolor background', () => {
  assert.strictEqual(P.bgCode('#7aa2f7', { truecolor: true }), '\x1b[48;2;122;162;247m');
});
test('bgCode emits empty string when no color caps', () => {
  assert.strictEqual(P.bgCode('#7aa2f7', {}), '');
});

test('rgbTo256 maps pure red to xterm index 196 (no cube overflow)', () => {
  assert.strictEqual(P.rgbTo256(255, 0, 0), 196);
});
test('fgCode emits 256 code 196 for saturated red', () => {
  assert.strictEqual(P.fgCode('#ff0000', { color256: true }), '\x1b[38;5;196m');
});
test('bgCode emits 256 code 196 for saturated red', () => {
  assert.strictEqual(P.bgCode('#ff0000', { color256: true }), '\x1b[48;5;196m');
});

test('colorize resets foreground only (\\x1b[39m), not full reset', () => {
  const pal = { high: '\x1b[38;5;196m', fgReset: '\x1b[39m', reset: '\x1b[0m' };
  assert.strictEqual(P.colorize('X', 'high', pal), '\x1b[38;5;196mX\x1b[39m');
});

const FAKE_STYLE = {
  palette: {
    dark:  { text:'#cfc6ba', dim:'#5d6370', low:'#5ec27a', mid:'#e6b450', high:'#e0533d',
             accent:'#d97757', accent2:'#e8a07e',
             deco: { sage:{bg:'#23332b', fg:'#a6e3a1'} } },
    light: { text:'#4a4640', dim:'#9a9080', low:'#4a8055', mid:'#9a7b1e', high:'#bf5a3c',
             accent:'#bf5a3c', accent2:'#bf5a3c',
             deco: { sage:{bg:'#dceadd', fg:'#4a8055'} } },
  },
};
test('resolveStylePalette truecolor dark maps roles to ANSI', () => {
  const pal = P.resolveStylePalette(FAKE_STYLE, 'dark', { truecolor: true });
  assert.strictEqual(pal.high, '\x1b[38;2;224;83;61m');
  assert.strictEqual(pal.accent, '\x1b[38;2;217;119;87m');
  assert.strictEqual(pal.fgReset, '\x1b[39m');
  assert.strictEqual(pal.reset, '\x1b[0m');
  assert.strictEqual(pal.deco.sage.bg, '\x1b[48;2;35;51;43m');
  assert.strictEqual(pal.deco.sage.fg, '\x1b[38;2;166;227;161m');
});
test('resolveStylePalette with no color caps drops deco backgrounds', () => {
  const pal = P.resolveStylePalette(FAKE_STYLE, 'dark', {});
  assert.deepStrictEqual(pal.deco, {});
  assert.ok(pal.high.startsWith('\x1b['));
});

test('resolveStylePalette dim falls back to SGR dim when role hex missing on color terminal', () => {
  const styleNoDim = { palette: { dark: { text:'#ffffff' } } }; // no dim hex
  const pal = P.resolveStylePalette(styleNoDim, 'dark', { truecolor: true });
  assert.strictEqual(pal.dim, '\x1b[2m');
});
test('resolveStylePalette: explicit empty dim stays empty (no SGR dim)', () => {
  const pal = P.resolveStylePalette({ palette: { dark: { dim: '' } } }, 'dark', { truecolor: true });
  assert.strictEqual(pal.dim, '');
});
test('resolveStylePalette: missing dim falls back to SGR dim', () => {
  const pal = P.resolveStylePalette({ palette: { dark: {} } }, 'dark', { truecolor: true });
  assert.strictEqual(pal.dim, '\x1b[2m');
});
