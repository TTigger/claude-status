#!/usr/bin/env node
// Regenerate media/demo.svg from the real renderer output.
// Renders the default `claude` style on a SINGLE adaptive line (the real
// statusline look) with demo data that exercises all three coral tiers
// (low 47% / mid 68% / high 85%), parses the ANSI the renderer emits, and
// emits a terminal-card SVG.
//
// Spacing strategy: tspans FLOW inline (only `fill` changes; no per-span x),
// so the viewer's font lays out glyphs correctly with no overlap. The whole
// line is fitted to a fixed content width via textLength + lengthAdjust, so it
// neither clips nor leaves a gap regardless of which monospace font renders it.
//
// Usage: node scripts/gen-demo-svg.js
//
// NOTE: npm's README renderer blocks SVG images, so the README embeds the
// rasterized media/demo.png (an absolute raw.githubusercontent URL). To
// regenerate the PNG after changing this SVG, open media/demo.svg at its
// natural size (1056x76) in a browser and screenshot it to media/demo.png.
const fs = require('node:fs');
const path = require('node:path');
const { renderHud } = require('../src/render');
const { DEFAULT_CONFIG } = require('../src/defaults');

const NOW = 0;
const stdin = {
  model: { id: 'claude-opus-4-8[1m]', display_name: 'Opus 4.8' },
  workspace: { project_dir: '/home/u/my-app', current_dir: '/home/u/my-app' },
  context_window: {
    context_window_size: 1000000,
    used_percentage: 47,
    current_usage: { input_tokens: 400000, cache_read_input_tokens: 70000 }, // 470k
  },
  rate_limits: {
    five_hour: { used_percentage: 68, resets_at: 4 * 3600 + 13 * 60 },   // 4h13m
    seven_day: { used_percentage: 85, resets_at: 5 * 86400 + 3 * 3600 }, // 5d3h
  },
};

const out = renderHud({
  stdin,
  config: { ...DEFAULT_CONFIG, layout: 'auto' },
  theme: 'dark',
  caps: { unicode: true, color256: true, truecolor: true, nerd: false },
  columns: 240,        // wide enough to keep everything on ONE line
  now: NOW,
  branch: 'main',
});

// --- xterm-256 -> #rrggbb ---
function xtermHex(n) {
  if (n < 16) {
    const base = [
      '000000', '800000', '008000', '808000', '000080', '800080', '008080', 'c0c0c0',
      '808080', 'ff0000', '00ff00', 'ffff00', '0000ff', 'ff00ff', '00ffff', 'ffffff',
    ];
    return '#' + base[n];
  }
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    const h = v.toString(16).padStart(2, '0');
    return '#' + h + h + h;
  }
  let i = n - 16;
  const r = Math.floor(i / 36); i -= r * 36;
  const g = Math.floor(i / 6); const b = i - g * 6;
  const ch = (l) => (l === 0 ? 0 : 55 + 40 * l).toString(16).padStart(2, '0');
  return '#' + ch(r) + ch(g) + ch(b);
}

const FG = '#d7d4cf'; // default foreground (uncolored text)
function ansiToSpans(line) {
  const spans = [];
  let cur = null;
  let buf = '';
  const flush = () => { if (buf) { spans.push({ text: buf, color: cur || FG }); buf = ''; } };
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0; let m;
  while ((m = re.exec(line))) {
    buf += line.slice(last, m.index);
    flush();
    last = re.lastIndex;
    const codes = m[1].split(';').filter((s) => s !== '').map(Number);
    if (codes.length === 0 || codes[0] === 0) cur = null;
    else if (codes[0] === 38 && codes[1] === 5) cur = xtermHex(codes[2]);
  }
  buf += line.slice(last);
  flush();
  return spans;
}

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rawLines = out.split('\n');
const lines = rawLines.map(ansiToSpans);
const plainLen = (spans) => spans.reduce((a, s) => a + [...s.text].length, 0);
const maxCols = Math.max(...lines.map(plainLen));

// --- layout metrics ---
const ADV = 9.0;        // nominal monospace advance at 15px (used only to size the canvas)
const FONT = 15;
const LINE_H = 26;
const PAD_X = 24;
const PAD_TOP = 54;     // room for the title bar
const PAD_BOTTOM = 22;
const contentW = Math.round(maxCols * ADV);
const width = contentW + PAD_X * 2;
const height = PAD_TOP + (lines.length - 1) * LINE_H + PAD_BOTTOM;

const dots = [['#ff5f56', 0], ['#ffbd2e', 1], ['#27c93f', 2]]
  .map(([c, i]) => `<circle cx="${22 + i * 20}" cy="22" r="6" fill="${c}"/>`)
  .join('');

let body = '';
lines.forEach((spans, row) => {
  const y = PAD_TOP + row * LINE_H;
  const inner = spans
    .map((s) => `<tspan fill="${s.color}">${xmlEsc(s.text)}</tspan>`)
    .join('');
  // textLength + lengthAdjust fits the whole line to contentW exactly,
  // so it renders identically regardless of the viewer's monospace font.
  body += `<text x="${PAD_X}" y="${y}" xml:space="preserve" textLength="${contentW}" lengthAdjust="spacingAndGlyphs">${inner}</text>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, 'Cascadia Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-size="${FONT}" font-weight="500">
  <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#1b1c1e"/>
  <rect x="0" y="0" width="${width}" height="40" rx="10" fill="#26282b"/>
  <rect x="0" y="30" width="${width}" height="10" fill="#26282b"/>
  ${dots}
  ${body}
</svg>
`;

const outPath = path.join(__dirname, '..', 'media', 'demo.svg');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg);
console.log('wrote', outPath, `(${width}x${height}, ${lines.length} line(s), ${maxCols} cols)`);
console.log('--- plain preview ---');
console.log(out.replace(/\x1b\[[0-9;]*m/g, ''));
