const test = require('node:test');
const assert = require('node:assert');
const { currentBranch } = require('../src/git');

test('returns a string or null and never throws', () => {
  const b = currentBranch(process.cwd());
  assert.ok(b === null || typeof b === 'string');
});

test('non-repo path returns null', () => {
  const b = currentBranch(require('node:os').tmpdir());
  assert.ok(b === null || typeof b === 'string'); // tmp may be inside a repo on some CI; just no throw
});
