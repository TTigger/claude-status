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

module.exports = { clampPct, tier };
