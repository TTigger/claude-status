const { bar, tier } = require('./format');
const { colorize } = require('./palette');

function renderMetric({ label, pct, suffix, style, palette, thresholds, barWidth }) {
  const tierName = tier(pct, thresholds);
  const glyphs = style.bar;
  const [open, close] = style.barWrap;
  const filledStr = bar(pct, barWidth, { full: glyphs.full, empty: glyphs.empty });
  // color the whole bar interior + percent by tier; brackets/label uncolored
  const coloredBar = open + colorize(filledStr, tierName, palette) + close;
  const coloredPct = colorize(`${pct}%`, tierName, palette);
  const parts = [label, coloredBar, coloredPct];
  if (suffix) parts.push(suffix);
  return parts.filter(Boolean).join(' ');
}

module.exports = { renderMetric };
