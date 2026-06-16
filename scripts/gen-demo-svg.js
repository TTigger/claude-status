#!/usr/bin/env node
// Regenerate media/demo.svg from the real renderer output — a stacked showcase
// of all FOUR styles (claude / mist / neon / ascii), each on a single adaptive
// line, with demo data that exercises the coral/tier ramp (ctx 47% / 5h 68% /
// 7d 85%). It parses the ANSI the renderer actually emits — truecolor (38;2 /
// 48;2), 256-colour (38;5 / 48;5), and fg/bg resets — and draws background
// "deco" runs (mist pills, neon segments) as rounded rects behind the glyphs.
//
// Layout strategy: a FIXED character grid. Every run is positioned at
// col*CW and stretched to exactly its cell count via textLength +
// lengthAdjust, so glyphs line up with their background rects regardless of
// which monospace font the viewer has. neon is rendered WITHOUT a Nerd Font
// (its rounded-block fallback) so the demo needs no special font to look right.
//
// Usage: node scripts/gen-demo-svg.js
//
// NOTE: npm's README renderer blocks SVG, so the README embeds the rasterized
// media/demo.png. Regenerate the PNG from the SVG with a headless browser
// screenshot (see scripts/shoot-demo.js / the release flow).
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

// neon is shown WITHOUT nerd so its powerline caps degrade to clean rounded
// blocks (no Nerd Font needed to view the PNG). The others use truecolor.
const DEMOS = [
  { style: 'claude', caps: { unicode: true, color256: true, truecolor: true, nerd: false } },
  { style: 'mist',   caps: { unicode: true, color256: true, truecolor: true, nerd: false } },
  { style: 'neon',   caps: { unicode: true, color256: true, truecolor: true, nerd: false } },
  { style: 'ascii',  caps: { color256: true } },
];

function renderLine(style, caps) {
  return renderHud({
    stdin,
    config: { ...DEFAULT_CONFIG, style, layout: 'oneline' },
    theme: 'dark',
    caps,
    columns: 240,
    now: NOW,
    branch: 'main',
  }).split('\n')[0];
}

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
const rgbHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

const FG = '#d7d4cf'; // default foreground (uncoloured text)

// Parse ANSI into runs of { text, fg, bg } honouring truecolor, 256, and resets.
function parseAnsi(line) {
  const runs = [];
  let fg = null, bg = null, buf = '';
  const flush = () => { if (buf) { runs.push({ text: buf, fg, bg }); buf = ''; } };
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    buf += line.slice(last, m.index);
    flush();
    last = re.lastIndex;
    const c = m[1].split(';').filter((s) => s !== '').map(Number);
    if (c.length === 0) { fg = null; bg = null; continue; }
    let i = 0;
    while (i < c.length) {
      const code = c[i];
      if (code === 0) { fg = null; bg = null; i += 1; }
      else if (code === 39) { fg = null; i += 1; }
      else if (code === 49) { bg = null; i += 1; }
      else if (code === 38 && c[i + 1] === 5) { fg = xtermHex(c[i + 2]); i += 3; }
      else if (code === 38 && c[i + 1] === 2) { fg = rgbHex(c[i + 2], c[i + 3], c[i + 4]); i += 5; }
      else if (code === 48 && c[i + 1] === 5) { bg = xtermHex(c[i + 2]); i += 3; }
      else if (code === 48 && c[i + 1] === 2) { bg = rgbHex(c[i + 2], c[i + 3], c[i + 4]); i += 5; }
      else { i += 1; } // ignore other SGR (dim/bold) for the static demo
    }
  }
  buf += line.slice(last);
  flush();
  return runs;
}

const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cols = (s) => [...s].length;

const rows = DEMOS.map((d) => ({ name: d.style, runs: parseAnsi(renderLine(d.style, d.caps)) }));
const rowCols = (runs) => runs.reduce((a, r) => a + cols(r.text), 0);
const maxCols = Math.max(...rows.map((r) => rowCols(r.runs)));

// --- layout metrics (fixed grid) ---
const CW = 9;          // cell advance (px)
const FONT = 15;
const LINE_H = 34;
const PAD_X = 22;
const PAD_TOP = 58;    // room for the title bar
const PAD_BOTTOM = 20;
const LABEL_W = 78;    // left gutter for the style name
const GRID_X = PAD_X + LABEL_W;
const contentW = maxCols * CW;
const width = GRID_X + contentW + PAD_X;
const height = PAD_TOP + (rows.length - 1) * LINE_H + PAD_BOTTOM + 14;

const dots = [['#ff5f56', 0], ['#ffbd2e', 1], ['#27c93f', 2]]
  .map(([c, i]) => `<circle cx="${22 + i * 20}" cy="24" r="6" fill="${c}"/>`)
  .join('');

let body = '';
rows.forEach((row, ri) => {
  const yTop = PAD_TOP + ri * LINE_H - 22;
  const yBase = PAD_TOP + ri * LINE_H;
  // style-name label in the gutter
  body += `<text x="${PAD_X}" y="${yBase}" fill="#6b7180" font-style="italic">${xmlEsc(row.name)}</text>`;
  // background rects first, then glyphs on top
  let col = 0;
  let bgSvg = '';
  let txtSvg = '';
  for (const run of row.runs) {
    const n = cols(run.text);
    const x = GRID_X + col * CW;
    const w = n * CW;
    if (run.bg) {
      bgSvg += `<rect x="${x.toFixed(1)}" y="${(yTop - 1).toFixed(1)}" width="${w.toFixed(1)}" height="${LINE_H - 8}" rx="5" fill="${run.bg}"/>`;
    }
    txtSvg += `<text x="${x.toFixed(1)}" y="${yBase}" xml:space="preserve" textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${run.fg || FG}">${xmlEsc(run.text)}</text>`;
    col += n;
  }
  body += bgSvg + txtSvg;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, 'Cascadia Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-size="${FONT}" font-weight="500">
  <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#1b1c1e"/>
  <rect x="0" y="0" width="${width}" height="44" fill="#26282b"/>
  ${dots}
  ${body}
</svg>
`;

const outPath = path.join(__dirname, '..', 'media', 'demo.svg');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg);
console.log('wrote', outPath, `(${width}x${height}, ${rows.length} styles, ${maxCols} cols)`);
for (const r of rows) {
  console.log(`  ${r.name.padEnd(8)} ${r.runs.map((x) => x.text).join('').replace(/\s+/g, ' ').trim()}`);
}
