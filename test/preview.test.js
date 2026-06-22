const test = require('node:test');
const assert = require('node:assert');
const { renderSample, galleryLine, previewHint } = require('../src/preview');
const { stripAnsi } = require('../src/format');

const RICH = { unicode: true, color256: true, truecolor: true, nerd: false };
const WEAK = {}; // no colour, no unicode

test('renderSample renders chosen style/layout with fixture data', () => {
  const out = stripAnsi(renderSample({ style: 'ascii', layout: 'oneline', columns: 200, caps: RICH }));
  assert.ok(out.includes('Opus 4.8'));
  assert.ok(out.includes('[####') || out.includes('[##')); // ascii bar present somewhere
});

test('galleryLine returns single-line preview for a style', () => {
  const line = galleryLine('minimal', 200, RICH);
  assert.strictEqual(line.split('\n').length, 1);
  assert.ok(stripAnsi(line).includes('23%') || stripAnsi(line).includes('24%'));
});

test('renderSample honours rich caps: neon shows colour + bars + non-Nerd caps', () => {
  const out = renderSample({ style: 'neon', layout: 'oneline', columns: 200, caps: RICH });
  assert.ok(/\x1b\[48;2/.test(out));                  // truecolour segment backgrounds
  assert.ok(/[█▉▊▋▌▍▎▏]/.test(out));                  // usage bars
  assert.ok(out.includes('◖') || out.includes('◗'));  // standard unicode caps
});

test('renderSample honours weak caps: no colour, no block bars', () => {
  const out = renderSample({ style: 'neon', layout: 'oneline', columns: 200, caps: WEAK });
  assert.ok(!/\x1b\[48;2/.test(out)); // no truecolour backgrounds
  assert.ok(!/[█▉▊▋▌▍▎▏]/.test(out)); // no block bars
});

test('renderSample defaults to weak caps when none passed (honest, not over-promising)', () => {
  const out = renderSample({ style: 'neon', layout: 'oneline', columns: 200 });
  assert.ok(!/\x1b\[48;2/.test(out)); // no colour when caps omitted
});

test('previewHint: no-colour/unicode terminal gets the terminal hint', () => {
  const h = previewHint(WEAK, 'plain line', 'neon');
  assert.match(h, /reports no colour\/unicode/);
  assert.match(h, /Windows Terminal/);
});

test('previewHint: capable terminal but bars dropped gets the width hint', () => {
  const h = previewHint(RICH, '◖ Ctx 24% ◗', 'neon'); // no block glyphs in the line
  assert.match(h, /widen the terminal/);
});

test('previewHint: fully capable line with bars gets no hint', () => {
  const h = previewHint(RICH, '◖ Ctx █▉██████ 24% ◗', 'neon');
  assert.strictEqual(h, '');
});

test('previewHint: ascii style never hints (same everywhere)', () => {
  assert.strictEqual(previewHint(WEAK, 'Ctx [####----] 24%', 'ascii'), '');
  assert.strictEqual(previewHint(RICH, 'Ctx [####----] 24%', 'ascii'), '');
});
