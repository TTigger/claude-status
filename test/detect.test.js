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

test('recommendStyle: full caps => claude, no unicode => ascii, nerd => tech', () => {
  assert.strictEqual(recommendStyle({ unicode: true, color256: true, truecolor: true, nerd: false }), 'claude');
  assert.strictEqual(recommendStyle({ unicode: false, color256: false, truecolor: false, nerd: false }), 'ascii');
  assert.strictEqual(recommendStyle({ unicode: true, color256: false, truecolor: false, nerd: true }), 'tech');
  assert.strictEqual(recommendStyle({ unicode: true, color256: false, truecolor: false, nerd: false }), 'classic');
});
