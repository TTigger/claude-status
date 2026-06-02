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

module.exports = { clampPct, tier, bar };
