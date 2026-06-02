const test = require('node:test');
const assert = require('node:assert');
const { mergeStatusLine } = require('../src/installer/settings');

test('mergeStatusLine adds statusLine but preserves other keys', () => {
  const before = { permissions: { allow: ['x'] }, theme: 'light' };
  const after = mergeStatusLine(before, 'claude-status-render', 30);
  assert.deepStrictEqual(after.permissions, { allow: ['x'] });
  assert.strictEqual(after.theme, 'light');
  assert.deepStrictEqual(after.statusLine,
    { type: 'command', command: 'claude-status-render', refreshInterval: 30 });
});

test('mergeStatusLine overwrites only statusLine if present', () => {
  const before = { statusLine: { type: 'command', command: 'old' }, a: 1 };
  const after = mergeStatusLine(before, 'claude-status-render', 15);
  assert.strictEqual(after.a, 1);
  assert.strictEqual(after.statusLine.command, 'claude-status-render');
  assert.strictEqual(after.statusLine.refreshInterval, 15);
});
