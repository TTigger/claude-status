const test = require('node:test');
const assert = require('node:assert');
const pkg = require('../package.json');

test('cs bin is registered and points at the claude-status CLI', () => {
  assert.strictEqual(pkg.bin.cs, 'bin/claude-status.js');
  assert.strictEqual(pkg.bin.cs, pkg.bin['claude-status']);
});
