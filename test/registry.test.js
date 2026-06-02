const test = require('node:test');
const assert = require('node:assert');
const { STYLES, LAYOUTS, CONFIG_SCHEMA } = require('../src/registry');

test('exactly 7 styles, claude first/default', () => {
  assert.strictEqual(STYLES.length, 7);
  assert.deepStrictEqual(STYLES.map(s => s.name).sort(),
    ['ascii', 'classic', 'claude', 'data', 'emoji', 'minimal', 'tech'].sort());
  const claude = STYLES.find(s => s.name === 'claude');
  assert.strictEqual(claude.colorMode, 'coral');
});

test('4 layouts including auto', () => {
  assert.deepStrictEqual(LAYOUTS.map(l => l.name).sort(),
    ['auto', 'oneline', 'three', 'two'].sort());
});

test('CONFIG_SCHEMA enumerates fixed-choice keys', () => {
  assert.deepStrictEqual(CONFIG_SCHEMA.style.choices.sort(),
    STYLES.map(s => s.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.layout.choices.sort(),
    LAYOUTS.map(l => l.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.palette.choices, ['auto', 'light', 'dark']);
});
