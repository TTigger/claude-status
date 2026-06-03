// Shared source of truth for README style mockups.
// Both scripts/sync-readme-styles.js and test/readme-mockups.test.js use this,
// so the doc and the guard never disagree on render parameters.
const { renderHud } = require('../src/render');
const { DEFAULT_CONFIG } = require('../src/defaults');
const { SAMPLE, SAMPLE_NOW } = require('../src/fixtures');
const { STYLES } = require('../src/registry');

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// The canonical "gallery" rendering for a style: three-layout, wide terminal,
// fixed fixture + now, all caps on (so glyphs are not downgraded). ANSI stripped.
function styleMockup(styleName) {
  const out = renderHud({
    stdin: SAMPLE,
    config: { ...DEFAULT_CONFIG, style: styleName, layout: 'three' },
    theme: 'dark',
    caps: { unicode: true, color256: true, truecolor: true, nerd: true },
    columns: 200,
    now: SAMPLE_NOW,
    branch: 'main',
  });
  return strip(out);
}

// The default HUD line shown in the README "The HUD" section: default config
// (claude style + auto layout) on a wide terminal, single line. ANSI stripped.
function defaultMockup() {
  const out = renderHud({
    stdin: SAMPLE,
    config: DEFAULT_CONFIG,
    theme: 'dark',
    caps: { unicode: true, color256: true, truecolor: true, nerd: true },
    columns: 200,
    now: SAMPLE_NOW,
    branch: 'main',
  });
  return strip(out);
}

module.exports = { styleMockup, defaultMockup, STYLES };
