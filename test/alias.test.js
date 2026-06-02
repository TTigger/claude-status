const test = require('node:test');
const assert = require('node:assert');
const { aliasSnippet, ccCollides } = require('../src/installer/alias');

test('aliasSnippet differs per shell', () => {
  assert.strictEqual(aliasSnippet('powershell', 'clc'), 'Set-Alias clc cc');
  assert.strictEqual(aliasSnippet('bash', 'clc'), "alias clc='cc'");
  assert.strictEqual(aliasSnippet('zsh', 'clc'), "alias clc='cc'");
});

test('ccCollides true on non-win when cc resolvable (simulated)', () => {
  assert.strictEqual(ccCollides('linux', () => '/usr/bin/cc'), true);
  assert.strictEqual(ccCollides('linux', () => null), false);
  assert.strictEqual(ccCollides('win32', () => '/usr/bin/cc'), false);
});
