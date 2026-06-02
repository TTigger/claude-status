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

function bar(pct, width, glyphs) {
  const p = clampPct(pct);
  const filled = Math.round((p / 100) * width);
  return glyphs.full.repeat(filled) + glyphs.empty.repeat(width - filled);
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

module.exports = { clampPct, tier, bar, humanizeDuration, tokensK, stripAnsi };
