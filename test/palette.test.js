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

const { resolveStylePalette: rsp } = require('../src/palette');
const { styleByName: sbn } = require('../src/registry');
const TC = { truecolor: true, color256: true, unicode: true };

test('claude resolves a darkened-tier empty track (from:tier)', () => {
  const p = rsp(sbn('claude'), 'dark', TC);
  // low #d97757 -> darken 0.30 -> #41241a -> truecolor fg
  assert.strictEqual(p.barEmptyTier.low, '\x1b[38;2;65;36;26m');
  assert.ok(p.barEmptyTier.mid && p.barEmptyTier.high);
  assert.deepStrictEqual(p.barTrack, undefined); // claude has no deco track
});

test('neon resolves faint-groove deco tracks + dark-ink fgReset (from:deco, factor 0.90)', () => {
  const p = rsp(sbn('neon'), 'dark', TC);
  // purple bg #bb9af7 -> darken 0.90 -> #a88bde
  assert.strictEqual(p.barTrack.purple, '\x1b[38;2;168;139;222m');
  // green bg #9ece6a -> darken 0.90 -> #8eb95f
  assert.strictEqual(p.barTrack.green, '\x1b[38;2;142;185;95m');
  assert.strictEqual(p.barEmptyTier, undefined);
  // neon segInk #16161e -> fgReset returns to the dark segment ink, not terminal default
  assert.strictEqual(p.fgReset, '\x1b[38;2;22;22;30m');
  // dark tier ink (readable on bright segments)
  assert.strictEqual(p.low, '\x1b[38;2;46;90;28m');
  assert.strictEqual(p.mid, '\x1b[38;2;135;83;18m');
  assert.strictEqual(p.high, '\x1b[38;2;158;37;51m');
});

test('neon fgReset falls back to default on a no-colour terminal', () => {
  const p = rsp(sbn('neon'), 'dark', { color256: false });
  assert.strictEqual(p.fgReset, '\x1b[39m');
});

test('mist resolves darkened-pill tracks (from:deco, factor 0.65)', () => {
  const p = rsp(sbn('mist'), 'dark', TC);
  // sage bg #23332b -> darken 0.65 -> #17211c
  assert.strictEqual(p.barTrack.sage, '\x1b[38;2;23;33;28m');
});

test('no-colour terminal omits both track structures', () => {
  const p = rsp(sbn('claude'), 'dark', { color256: false });
  assert.strictEqual(p.barEmptyTier, undefined);
  assert.strictEqual(p.barTrack, undefined);
});
