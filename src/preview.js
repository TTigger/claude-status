const { renderHud } = require('./render');
const { DEFAULT_CONFIG } = require('./defaults');
const { deepMerge } = require('./config');
const { SAMPLE, SAMPLE_NOW } = require('./fixtures');

function renderSample({ style, layout, columns, theme = 'dark' }) {
  const config = deepMerge(DEFAULT_CONFIG, {
    ...(style ? { style } : {}), ...(layout ? { layout } : {}),
  });
  return renderHud({
    stdin: SAMPLE, config, theme,
    caps: { unicode: true, color256: true, truecolor: true, nerd: true },
    columns: columns || 100, now: SAMPLE_NOW, branch: 'main',
  });
}

function galleryLine(style, columns) {
  return renderSample({ style, layout: 'oneline', columns: columns || 100 });
}

module.exports = { renderSample, galleryLine };
