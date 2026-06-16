const test = require('node:test');
const assert = require('node:assert');
const { DEFAULT_CONFIG } = require('../src/defaults');
const { CONFIG_SCHEMA } = require('../src/registry');

test('default style is claude', () => {
  assert.strictEqual(DEFAULT_CONFIG.style, 'claude');
});
test('style schema offers exactly the 4 styles', () => {
  assert.deepStrictEqual([...CONFIG_SCHEMA.style.choices].sort(), ['ascii','claude','mist','neon']);
});
