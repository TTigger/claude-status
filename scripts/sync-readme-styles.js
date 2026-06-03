#!/usr/bin/env node
// Rewrite each style's fenced mockup in README.md to match the ACTUAL renderer
// output (via scripts/styleMockup.js). Run this after changing a style/registry
// so the README gallery never drifts. The test/readme-mockups.test.js guard
// fails CI if you forget. Special glyphs (Nerd/braille/emoji) are handled by the
// program, so there is zero hand-transcription risk.
//
// Usage: node scripts/sync-readme-styles.js
const fs = require('node:fs');
const path = require('node:path');
const { styleMockup, defaultMockup, STYLES } = require('./styleMockup');

const readmePath = path.join(__dirname, '..', 'README.md');
let md = fs.readFileSync(readmePath, 'utf8');

// Sync the "## The HUD" single-line default mockup first.
{
  const hudRe = new RegExp('(##\\s+The HUD\\n(?:(?!```)[^\\n]*\\n)*?```[^\\n]*\\n)[\\s\\S]*?(\\n```)');
  if (!hudRe.test(md)) {
    console.error('sync-readme-styles: no fenced block found under "## The HUD"');
    process.exit(1);
  }
  md = md.replace(hudRe, (_m, pre, post) => pre + defaultMockup() + post);
}

for (const st of STYLES) {
  const mock = styleMockup(st.name);
  // Match: "### `name` ...<optional prose lines>... ```\n<body>\n```"
  // Capture the header+prose+opening-fence as group 1 and the closing fence as
  // group 2; replace the body in between with the real render.
  const re = new RegExp(
    '(###\\s+`' + st.name + '`[^\\n]*\\n(?:(?!```)[^\\n]*\\n)*?```[^\\n]*\\n)[\\s\\S]*?(\\n```)'
  );
  if (!re.test(md)) {
    console.error(`sync-readme-styles: no fenced block found for style "${st.name}"`);
    process.exit(1);
  }
  md = md.replace(re, (_m, pre, post) => pre + mock + post);
}

fs.writeFileSync(readmePath, md);
console.log(`synced The HUD line + ${STYLES.length} style mockups in README.md`);
