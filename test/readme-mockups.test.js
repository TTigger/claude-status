const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { styleMockup, defaultMockup, STYLES } = require('../scripts/styleMockup');

// Mockup-drift guard: every style's README gallery block must equal the ACTUAL
// renderer output. If you change a style/registry and forget to update the
// README, this fails — run `node scripts/sync-readme-styles.js` to fix.
const README = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

test('README "The HUD" section matches the default (claude/auto) render', () => {
  const expected = defaultMockup();
  assert.ok(
    README.includes(expected),
    `README "The HUD" line is stale.\nExpected to find:\n${expected}\n\nRun: node scripts/sync-readme-styles.js`
  );
});

for (const st of STYLES) {
  test(`README gallery for "${st.name}" matches the actual render`, () => {
    const expected = styleMockup(st.name);
    assert.ok(
      README.includes(expected),
      `README "${st.name}" mockup is stale.\nExpected to find:\n${expected}\n\nRun: node scripts/sync-readme-styles.js`
    );
  });
}
