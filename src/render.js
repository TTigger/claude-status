const { buildElements } = require('./elements');
const { buildParts } = require('./engine');
const { layoutLines } = require('./layout');
const { resolvePalette } = require('./palette');
const { styleByName, STYLES } = require('./registry');

function resolveTheme(configPalette, theme) {
  if (configPalette === 'light' || configPalette === 'dark') return configPalette;
  return theme === 'light' ? 'light' : 'dark';
}

function renderHud(ctx) {
  const { stdin, config, theme, caps, columns, now, branch } = ctx;
  const style = styleByName(config.style) || STYLES[0];
  const els = buildElements(stdin, { autoCompactThresholdPct: config.autoCompact.thresholdPct });
  els.branch = branch || null;

  const effTheme = resolveTheme(config.palette, theme);
  const palette = resolvePalette(style.colorMode, effTheme, caps);
  const barWidth = config.barWidth === 'auto'
    ? Math.max(4, Math.min(12, Math.floor((columns || 100) / 12)))
    : config.barWidth;

  const noLimits = !els.session && !els.weekly;
  const build = (opts) => {
    const parts = buildParts({ els, style, palette, config: { ...config, barWidth }, now, opts });
    if (noLimits && (config.elements.session || config.elements.weekly)) {
      parts.push({ key: 'limits-note', text: '— waiting for first message', group: 'limits' });
    }
    return parts;
  };

  return layoutLines(build, config.layout, columns || 100, config.separator);
}

module.exports = { renderHud };
