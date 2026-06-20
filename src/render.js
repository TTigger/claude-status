const { buildElements } = require('./elements');
const { buildParts, decorate } = require('./engine');
const { layoutLines } = require('./layout');
const { resolveStylePalette } = require('./palette');
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
  const palette = resolveStylePalette(style, effTheme, caps);
  const barWidth = config.barWidth === 'auto'
    ? Math.max(4, Math.min(12, Math.floor((columns || 100) / 12)))
    : config.barWidth;

  const noLimits = !els.session && !els.weekly;
  const costShown = !!(config.elements.cost && els.cost && els.cost.isApiKey);
  const build = (opts) => {
    const raw = buildParts({ els, style, palette, config: { ...config, barWidth }, now, opts, caps });
    if (noLimits && !costShown && (config.elements.session || config.elements.weekly)) {
      raw.push({ key: 'limits-note', text: '— waiting for first message', group: 'limits', plain: true });
    }
    return decorate(raw, style, palette, caps).parts;
  };
  const decSep = decorate([], style, palette, caps).sep;
  const sep = decSep !== undefined ? decSep : config.separator;

  return layoutLines(build, config.layout, columns || 100, sep);
}

module.exports = { renderHud };
