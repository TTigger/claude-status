const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { STYLES } = require('../src/registry');

test('README lists every registry style name', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  for (const s of STYLES) {
    assert.ok(readme.includes(s.name), `README missing style "${s.name}"`);
  }
});
