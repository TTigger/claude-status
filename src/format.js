function clampPct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tier(pct, thresholds) {
  const { green, yellow } = thresholds;
  if (pct <= green) return 'low';
  if (pct <= yellow) return 'mid';
  return 'high';
}

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

function bar(pct, width, glyphs, subcell) {
  const p = clampPct(pct);
  if (!subcell) {
    const filled = Math.round((p / 100) * width);
    return { fill: glyphs.full.repeat(filled), empty: glyphs.empty.repeat(width - filled) };
  }
  const e = Math.round((p / 100) * width * 8);
  const f = Math.floor(e / 8);
  const r = e % 8;
  let fill = glyphs.full.repeat(f);
  if (r > 0) fill += EIGHTHS[r];
  const used = f + (r > 0 ? 1 : 0);
  return { fill, empty: glyphs.empty.repeat(Math.max(0, width - used)) };
}

function humanizeDuration(seconds) {
  let s = Math.floor(seconds);
  if (s <= 0) return s < 0 ? '0m' : '<1m';
  if (s < 60) return '<1m';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d${h}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function tokensK(tokens, decimals = false) {
  const k = tokens / 1000;
  return decimals ? `${k.toFixed(1)}k` : `${Math.round(k)}k`;
}

function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

function darken(hex, factor) {
  const h = hex.replace('#', '');
  const ch = (i) => {
    const v = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * factor)));
    return v.toString(16).padStart(2, '0');
  };
  return '#' + ch(0) + ch(2) + ch(4);
}

module.exports = { clampPct, tier, bar, darken, humanizeDuration, tokensK, stripAnsi };
