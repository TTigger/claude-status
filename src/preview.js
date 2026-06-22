const { renderHud } = require('./render');
const { DEFAULT_CONFIG } = require('./defaults');
const { deepMerge } = require('./config');
const { SAMPLE, SAMPLE_NOW } = require('./fixtures');

function renderSample({ style, layout, columns, theme = 'dark', caps }) {
  const config = deepMerge(DEFAULT_CONFIG, {
    ...(style ? { style } : {}), ...(layout ? { layout } : {}),
  });
  return renderHud({
    stdin: SAMPLE, config, theme,
    caps: caps || {},
    columns: columns || 100, now: SAMPLE_NOW, branch: 'main',
  });
}

function galleryLine(style, columns, caps) {
  return renderSample({ style, layout: 'oneline', columns: columns || 100, caps });
}

function previewHint(caps, line, styleName) {
  if (styleName === 'ascii') return ''; // compatibility style: same everywhere, needs no caps
  const noColour = !(caps && (caps.truecolor || caps.color256));
  const noUnicode = !(caps && caps.unicode);
  if (noColour || noUnicode) {
    const missing = [noColour && 'colour', noUnicode && 'unicode'].filter(Boolean).join('/');
    return `note: this terminal reports no ${missing}; for the full look use Windows Terminal or VS Code, or try the 'claude'/'ascii' style.`;
  }
  // `line` is the whole rendered output (possibly multi-line); the gauges drop
  // together at a width threshold, so "no block glyph anywhere" means the bars
  // were shed to fit. ascii is already exempted above (its bars are #/-).
  if (!/[█▉▊▋▌▍▎▏]/.test(line)) {
    return 'note: widen the terminal to ~120 columns to see the usage bars.';
  }
  return '';
}

module.exports = { renderSample, galleryLine, previewHint };
