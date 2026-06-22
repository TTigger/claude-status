const test = require('node:test');
const assert = require('node:assert');
const { renderMetric, decorate } = require('../src/engine');
const { resolveStylePalette } = require('../src/palette');
const { stripAnsi } = require('../src/format');
const { styleByName } = require('../src/registry');

const style = styleByName('ascii');
const palette = resolveStylePalette(style, 'dark', { color256: false });
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
const { SAMPLE, SAMPLE_NOW, SAMPLE_APIKEY } = require('../src/fixtures');
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

test('cost segment shows in API-key mode (no rate_limits) with est marker', () => {
  const els = buildElements(SAMPLE_APIKEY, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  const cost = parts.find(p => p.key === 'cost');
  assert.ok(cost, 'cost segment present in API-key mode');
  assert.strictEqual(stripAnsi(cost.text), '$0.0123 est · 47k ctx');
  // and session/weekly must NOT be present (no rate_limits)
  assert.ok(!parts.find(p => p.key === 'session'));
});

test('cost segment hidden in subscription mode (rate_limits present)', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  assert.ok(!parts.find(p => p.key === 'cost'), 'no cost when rate_limits present');
});

test('cost segment respects elements.cost=false', () => {
  const els = buildElements(SAMPLE_APIKEY, { autoCompactThresholdPct: 83.5 });
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii', elements: { ...DEFAULT_CONFIG.elements, cost: false } },
    now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  assert.ok(!parts.find(p => p.key === 'cost'));
});

test('session at 100% renders LIMIT instead of a bar', () => {
  const els = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  els.session = { pct: 100, resetsAt: els.session.resetsAt };
  els.branch = 'main';
  const parts = buildParts({
    els, style: styleByName('ascii'), palette,
    config: { ...DEFAULT_CONFIG, style: 'ascii' }, now: SAMPLE_NOW,
    opts: { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true },
  });
  const s = parts.find(p => p.key === 'session');
  assert.match(stripAnsi(s.text), /^Ses LIMIT /);
  assert.doesNotMatch(stripAnsi(s.text), /\[#*-*\]/); // no bar
});

function mkPal() {
  return { reset:'\x1b[0m', fgReset:'\x1b[39m', text:'', dim:'',
    deco: { sage:{bg:'\x1b[48;5;22m',fg:'\x1b[38;5;114m'},
            blue:{bg:'\x1b[48;5;111m',fg:'\x1b[38;5;234m'} } };
}
test('decorate none returns parts unchanged in text, terminated with reset', () => {
  const parts = [{ key:'model', text:'Opus', group:'env' }];
  const out = decorate(parts, { decoration:{type:'none'} }, mkPal(), { truecolor:true });
  assert.strictEqual(out.parts[0].text, 'Opus\x1b[0m');
  assert.strictEqual(out.sep, undefined);
});
test('decorate pill wraps assigned key with bg+fg pad+reset', () => {
  const style = { decoration:{ type:'pill', assign:{ context:'sage' } } };
  const parts = [{ key:'context', text:'Ctx 24%', group:'context' }];
  const out = decorate(parts, style, mkPal(), { color256:true });
  assert.strictEqual(out.parts[0].text, '\x1b[48;5;22m\x1b[38;5;114m Ctx 24% \x1b[0m');
});
test('decorate pill without color caps (empty deco) leaves text plain', () => {
  const style = { decoration:{ type:'pill', assign:{ context:'sage' } } };
  const pal = { reset:'\x1b[0m', fgReset:'\x1b[39m', deco:{} };
  const out = decorate([{ key:'context', text:'Ctx', group:'context' }], style, pal, {});
  assert.strictEqual(out.parts[0].text, 'Ctx\x1b[0m');
});
test('decorate segment with nerd adds powerline lozenge caps and empty sep', () => {
  const style = { decoration:{ type:'segment', byGroup:true, assign:{ _env:'blue' } } };
  const parts = [{ key:'model', text:'Opus', group:'env' }];
  const out = decorate(parts, style, mkPal(), { color256:true, nerd:true });
  assert.strictEqual(out.sep, '');
  assert.strictEqual(out.parts[0].text,
    '[38;5;111m[48;5;111m[38;5;234m Opus [49m[38;5;111m[0m');
});
test('decorate segment without nerd falls back to rounded bg pill, space sep', () => {
  const style = { decoration:{ type:'segment', byGroup:true, assign:{ _env:'blue' } } };
  const out = decorate([{ key:'model', text:'Opus', group:'env' }], style, mkPal(), { color256:true });
  assert.strictEqual(out.sep, ' ');
  assert.strictEqual(out.parts[0].text, '\x1b[48;5;111m\x1b[38;5;234m Opus \x1b[0m');
});

test('decorate segment without nerd but with unicode uses Unicode half-circle caps, empty sep', () => {
  const style = { decoration:{ type:'segment', byGroup:true, assign:{ _env:'blue' } } };
  const parts = [{ key:'model', text:'Opus', group:'env' }];
  const out = decorate(parts, style, mkPal(), { color256:true, unicode:true });
  assert.strictEqual(out.sep, '');
  assert.strictEqual(out.parts[0].text,
    '\x1b[38;5;111m◖\x1b[48;5;111m\x1b[38;5;234m Opus \x1b[49m\x1b[38;5;111m◗\x1b[0m');
});

test('decorate pill with no assign object does not throw', () => {
  const out = decorate([{ key:'x', text:'A', group:'env' }], { decoration:{type:'pill'} },
    { reset:'\x1b[0m', deco:{} }, {});
  assert.strictEqual(out.parts[0].text, 'A\x1b[0m');
});
test('decorate segment leaves plain-flagged parts undecorated (no bg, no glyph)', () => {
  const style = { decoration:{ type:'segment', byGroup:true, assign:{ _env:'blue' } } };
  const parts = [{ key:'note', text:'— waiting', group:'env', plain:true }];
  const out = decorate(parts, style, mkPal(), { color256:true, nerd:true });
  assert.strictEqual(out.parts[0].text, '— waiting\x1b[0m');
});
test('decorate pill leaves plain-flagged parts undecorated', () => {
  const style = { decoration:{ type:'pill', assign:{ x:'sage' } } };
  const parts = [{ key:'x', text:'P', group:'context', plain:true }];
  const out = decorate(parts, style, mkPal(), { color256:true });
  assert.strictEqual(out.parts[0].text, 'P\x1b[0m');
});

test('decorate segment with empty deco (no colour) returns undefined sep so default separator is used', () => {
  const style = { decoration:{ type:'segment', byGroup:true, assign:{ _env:'blue' } } };
  const pal = { reset:'\x1b[0m', fgReset:'\x1b[39m', deco:{} };
  const out = decorate([{ key:'m', text:'A', group:'env' }, { key:'p', text:'B', group:'env' }], style, pal, { unicode:true });
  assert.strictEqual(out.sep, undefined);
  assert.strictEqual(out.parts[0].text, 'A\x1b[0m');
  assert.strictEqual(out.parts[1].text, 'B\x1b[0m');
});

test('neon with unicode but no colour renders with the default separator (not glued together)', () => {
  const { renderHud } = require('../src/render');
  const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');
  const { DEFAULT_CONFIG } = require('../src/defaults');
  const out = renderHud({ stdin: SAMPLE, config: { ...DEFAULT_CONFIG, style:'neon', layout:'oneline' },
    theme:'dark', caps:{ unicode:true }, columns:200, now:SAMPLE_NOW, branch:'main' });
  assert.ok(out.includes(' | '), 'expected default " | " separators, got: ' + JSON.stringify(out));
});

const { stripAnsi: strip } = require('../src/format');
const TCU = { truecolor: true, color256: true, unicode: true };

test('claude renderMetric sub-cell: 47/50/52 produce distinct bars', () => {
  const cl = styleByName('claude');
  const pal = resolveStylePalette(cl, 'dark', TCU);
  const mk = (pct) => strip(renderMetric({
    label: 'Ctx', pct, suffix: '', style: cl, palette: pal,
    thresholds, barWidth: 8, caps: TCU, group: 'context', metricKey: 'context',
  }));
  const a = mk(47), b = mk(50), c = mk(52);
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(b, c);
  assert.match(a, /███▊████/);
  assert.match(b, /████████/);
  assert.match(c, /████▏███/);
});

test('claude renderMetric colours empty cells with the darkened-tier track', () => {
  const cl = styleByName('claude');
  const pal = resolveStylePalette(cl, 'dark', TCU);
  const out = renderMetric({
    label: 'Ctx', pct: 24, suffix: '', style: cl, palette: pal,
    thresholds, barWidth: 8, caps: TCU, group: 'context', metricKey: 'context',
  });
  assert.ok(out.includes(pal.low));            // tier fill present
  assert.ok(out.includes(pal.barEmptyTier.low)); // darkened empty track present
});

test('neon renderMetric colours empty with the segment-bg track (per group)', () => {
  const ne = styleByName('neon');
  const pal = resolveStylePalette(ne, 'dark', TCU);
  const out = renderMetric({
    label: 'S', pct: 52, suffix: '', style: ne, palette: pal,
    thresholds, barWidth: 8, caps: TCU, group: 'limits', metricKey: 'session',
  });
  assert.ok(out.includes(pal.barTrack.green)); // _limits -> green track
});

test('mist renderMetric colours empty with the per-key pill track (non-byGroup)', () => {
  const mi = styleByName('mist');
  const pal = resolveStylePalette(mi, 'dark', TCU);
  const out = renderMetric({
    label: 'S', pct: 52, suffix: '', style: mi, palette: pal,
    thresholds, barWidth: 8, caps: TCU, group: 'limits', metricKey: 'session',
  });
  assert.ok(out.includes(pal.barTrack.gold)); // session -> gold track (per-key assign)
});

test('neon renderMetric: dark tier ink, no bright-green fg, dark-ink suffix', () => {
  const ne = styleByName('neon');
  const pal = resolveStylePalette(ne, 'dark', TCU);
  const out = renderMetric({
    label: 'S', pct: 7, suffix: '1h44m', style: ne, palette: pal,
    thresholds, barWidth: 8, caps: TCU, group: 'limits', metricKey: 'session',
  });
  assert.strictEqual(pal.low, '\x1b[38;2;46;90;28m');        // dark green low tier
  assert.ok(out.includes(pal.low));                          // used for fill + percentage
  assert.ok(!out.includes('\x1b[38;2;158;206;106m'));        // no bright-green FG (the old bug)
  assert.ok(out.includes('\x1b[38;2;22;22;30m 1h44m'));      // suffix preceded by dark-ink reset
});

test('ascii renderMetric is unchanged (single tier span, no track)', () => {
  const out = renderMetric({
    label: 'Ctx', pct: 23, suffix: '47k', style, palette, thresholds, barWidth: 8,
    caps: { color256: false }, group: 'context', metricKey: 'context',
  });
  assert.strictEqual(strip(out), 'Ctx [##------] 23% 47k');
});
