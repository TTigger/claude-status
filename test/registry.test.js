const test = require('node:test');
const assert = require('node:assert');
const { STYLES, LAYOUTS, CONFIG_SCHEMA, styleByName, STYLE_ALIASES } = require('../src/registry');

test('exactly 4 styles ship', () => {
  assert.deepStrictEqual(STYLES.map(s => s.name).sort(), ['ascii', 'claude', 'mist', 'neon']);
});
test('every non-ascii style has palette dark+light and a decoration type', () => {
  for (const s of STYLES.filter(s => s.name !== 'ascii')) {
    assert.ok(s.palette.dark && s.palette.light, `${s.name} needs dark+light`);
    assert.ok(['none', 'pill', 'segment'].includes(s.decoration.type), `${s.name} decoration`);
  }
});
test('deprecated style names alias to nearest new theme', () => {
  assert.strictEqual(styleByName('classic').name, 'claude');
  assert.strictEqual(styleByName('minimal').name, 'claude');
  assert.strictEqual(styleByName('tech').name, 'neon');
  assert.strictEqual(styleByName('data').name, 'neon');
  assert.strictEqual(styleByName('emoji').name, 'mist');
});
test('unknown style returns null', () => {
  assert.strictEqual(styleByName('nope'), null);
});

test('4 layouts including auto', () => {
  assert.deepStrictEqual(LAYOUTS.map(l => l.name).sort(),
    ['auto', 'oneline', 'three', 'two'].sort());
});

test('CONFIG_SCHEMA style choices match 4 styles', () => {
  assert.deepStrictEqual(CONFIG_SCHEMA.style.choices.sort(),
    STYLES.map(s => s.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.layout.choices.sort(),
    LAYOUTS.map(l => l.name).sort());
  assert.deepStrictEqual(CONFIG_SCHEMA.palette.choices, ['auto', 'light', 'dark']);
});

test('elements.cost is a registered boolean defaulting to true', () => {
  assert.strictEqual(CONFIG_SCHEMA['elements.cost'].type, 'bool');
  assert.strictEqual(CONFIG_SCHEMA['elements.cost'].default, true);
});

test('CONFIG_SCHEMA defines the five ping keys with correct defaults', () => {
  assert.strictEqual(CONFIG_SCHEMA['ping.enabled'].default, true);
  assert.strictEqual(CONFIG_SCHEMA['ping.minSeconds'].default, 30);
  assert.strictEqual(CONFIG_SCHEMA['ping.minSeconds'].type, 'int');
  assert.strictEqual(CONFIG_SCHEMA['ping.onWaiting'].default, true);
  assert.strictEqual(CONFIG_SCHEMA['ping.waitingCooldownSec'].default, 60);
  assert.strictEqual(CONFIG_SCHEMA['ping.sound'].default, false);
  // No dead knobs (D4): jumpBack/summary must NOT exist in v1
  assert.ok(!('ping.jumpBack' in CONFIG_SCHEMA));
  assert.ok(!('ping.summary' in CONFIG_SCHEMA));
});
