const test = require('node:test');
const assert = require('node:assert');
const { capabilities, recommendStyle } = require('../src/detect');

test('truecolor env detected', () => {
  const c = capabilities({ COLORTERM: 'truecolor', TERM: 'xterm-256color' }, 'linux');
  assert.strictEqual(c.truecolor, true);
  assert.strictEqual(c.color256, true);
  assert.strictEqual(c.unicode, true);
});

test('legacy windows console (no WT_SESSION) => no unicode', () => {
  const c = capabilities({ TERM: '' }, 'win32');
  assert.strictEqual(c.unicode, false);
});

test('recommendStyle: no unicode -> ascii', () => {
  assert.strictEqual(recommendStyle({ unicode: false }), 'ascii');
});
test('recommendStyle: nerd -> neon', () => {
  assert.strictEqual(recommendStyle({ unicode: true, nerd: true }), 'neon');
});
test('recommendStyle: color but no nerd -> claude', () => {
  assert.strictEqual(recommendStyle({ unicode: true, truecolor: true }), 'claude');
});
test('recommendStyle: plain unicode -> claude', () => {
  assert.strictEqual(recommendStyle({ unicode: true }), 'claude');
});
