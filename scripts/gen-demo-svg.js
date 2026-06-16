#!/usr/bin/env node
// Regenerate the demo media from the REAL renderer output.
//
// Produces:
//   media/demo.svg          — stacked showcase of all 4 styles (the hero image)
//   media/style-<name>.svg  — one single-line preview per style (README gallery)
//
// It parses the ANSI the renderer actually emits — truecolor (38;2 / 48;2),
// 256-colour (38;5 / 48;5), fg/bg resets — and draws background "deco" runs
// (mist pills, neon segments) as rounded rects. neon is rendered WITHOUT a Nerd
// Font (the default), so its segment end-caps are the standard Unicode
// half-circles ◖/◗ (U+25D6/7); those cap glyphs — and the Nerd-Font U+E0B6/U+E0B4
// — are drawn as SVG half-ellipses so the PNG matches what users actually see.
//
// Layout: a FIXED character grid. Every run sits at col*CW and is stretched to
// exactly its cell count via textLength + lengthAdjust, so glyphs line up with
// their background rects regardless of the viewer's monospace font.
//
// Usage:   node scripts/gen-demo-svg.js
// Rasterise to PNG (npm blocks SVG in READMEs): open each .svg in a headless
// browser at 2x and screenshot the <img> element to the matching .png.
const fs = require('node:fs');
const path = require('node:path');
const { renderHud } = require('../src/render');
const { DEFAULT_CONFIG } = require('../src/defaults');

const PL_LEFT = '';  // powerline left half-circle (Nerd Font)
const PL_RIGHT = ''; // powerline right half-circle (Nerd Font)

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

// All styles render at common-default caps (no Nerd Font) so the demo matches
// the default experience; neon's ◖/◗ caps are drawn as SVG shapes.
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
// Standard-Unicode half-circle caps (the default neon look, no Nerd Font).
const UNI_LEFT = '◖';
const UNI_RIGHT = '◗';
const isLeftCap = (s) => s === PL_LEFT || s === UNI_LEFT;
const isRightCap = (s) => s === PL_RIGHT || s === UNI_RIGHT;

// --- layout metrics (fixed grid) ---
const CW = 9;          // cell advance (px)
const FONT = 15;
const LINE_H = 34;
const PAD_X = 22;
const PAD_TOP = 58;    // room for the title bar
const PAD_BOTTOM = 20;
const LABEL_W = 78;    // left gutter for the style name (hero only)

function buildSvg(demos, { showLabel }) {
  const rows = demos.map((d) => ({ name: d.style, runs: parseAnsi(renderLine(d.style, d.caps)) }));
  const rowCols = (runs) => runs.reduce((a, r) => a + cols(r.text), 0);
  const maxCols = Math.max(...rows.map((r) => rowCols(r.runs)));

  const gridX = PAD_X + (showLabel ? LABEL_W : 0);
  const contentW = maxCols * CW;
  const width = gridX + contentW + PAD_X;
  const height = PAD_TOP + (rows.length - 1) * LINE_H + PAD_BOTTOM + 14;

  const dots = [['#ff5f56', 0], ['#ffbd2e', 1], ['#27c93f', 2]]
    .map(([c, i]) => `<circle cx="${22 + i * 20}" cy="24" r="6" fill="${c}"/>`)
    .join('');

  let body = '';
  rows.forEach((row, ri) => {
    const yTop = PAD_TOP + ri * LINE_H - 22;
    const yBase = PAD_TOP + ri * LINE_H;
    const segY = yTop - 1;
    const segH = LINE_H - 8;
    if (showLabel) {
      body += `<text x="${PAD_X}" y="${yBase}" fill="#6b7180" font-style="italic">${xmlEsc(row.name)}</text>`;
    }
    let col = 0;
    let bgSvg = '';
    let fgSvg = '';
    // Coalesce consecutive runs that share a background colour into ONE pill
    // rect, so per-run foreground changes (e.g. a coloured bar on a coloured
    // segment) don't leave rounded notches inside a single segment.
    let curBg = null; // { color, startCol, cols }
    const flushBg = () => {
      if (!curBg) return;
      const bx = gridX + curBg.startCol * CW;
      const bw = curBg.cols * CW;
      bgSvg += `<rect x="${bx.toFixed(1)}" y="${segY.toFixed(1)}" width="${bw.toFixed(1)}" height="${segH}" rx="4" fill="${curBg.color}"/>`;
      curBg = null;
    };
    for (const run of row.runs) {
      const n = cols(run.text);
      const x = gridX + col * CW;
      // powerline cap glyph -> draw a half-ellipse in the segment colour
      if (isLeftCap(run.text) || isRightCap(run.text)) {
        flushBg();
        const ry = segH / 2;
        const cy0 = segY, cy1 = segY + segH;
        const d = isLeftCap(run.text)
          ? `M ${(x + CW).toFixed(1)} ${cy0} A ${CW} ${ry.toFixed(1)} 0 0 0 ${(x + CW).toFixed(1)} ${cy1} Z`
          : `M ${x.toFixed(1)} ${cy0} A ${CW} ${ry.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${cy1} Z`;
        bgSvg += `<path d="${d}" fill="${run.fg || FG}"/>`;
        col += n;
        continue;
      }
      if (run.bg) {
        if (curBg && curBg.color === run.bg) curBg.cols += n;
        else { flushBg(); curBg = { color: run.bg, startCol: col, cols: n }; }
      } else {
        flushBg();
      }
      const w = n * CW;
      fgSvg += `<text x="${x.toFixed(1)}" y="${yBase}" xml:space="preserve" textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${run.fg || FG}">${xmlEsc(run.text)}</text>`;
      col += n;
    }
    flushBg();
    body += bgSvg + fgSvg;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, 'Cascadia Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-size="${FONT}" font-weight="500">
  <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#1b1c1e"/>
  <rect x="0" y="0" width="${width}" height="44" fill="#26282b"/>
  ${dots}
  ${body}
</svg>
`;
}

const mediaDir = path.join(__dirname, '..', 'media');
fs.mkdirSync(mediaDir, { recursive: true });

const heroSvg = buildSvg(DEMOS, { showLabel: true });
fs.writeFileSync(path.join(mediaDir, 'demo.svg'), heroSvg);
console.log('wrote media/demo.svg (hero, 4 styles)');

for (const d of DEMOS) {
  const svg = buildSvg([d], { showLabel: false });
  fs.writeFileSync(path.join(mediaDir, `style-${d.style}.svg`), svg);
  console.log(`wrote media/style-${d.style}.svg`);
}

console.log('--- plain preview ---');
for (const d of DEMOS) {
  console.log(d.style.padEnd(8), renderLine(d.style, d.caps).replace(/\x1b\[[0-9;]*m/g, ''));
}
