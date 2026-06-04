const test = require('node:test');
const assert = require('node:assert');
const { mergeStatusLine } = require('../src/installer/settings');
const { mergeHooks, stripHooks } = require('../src/installer/settings');

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

test('readSettings tolerates a UTF-8 BOM (does not wipe existing keys)', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { readSettings } = require('../src/installer/settings');
  const p = path.join(os.tmpdir(), 'bom-settings-' + process.pid + '.json');
  fs.writeFileSync(p, '﻿' + JSON.stringify({ theme: 'dark', permissions: { allow: ['KEEPME'] } }));
  const parsed = readSettings(p);
  assert.strictEqual(parsed.theme, 'dark');
  assert.deepStrictEqual(parsed.permissions, { allow: ['KEEPME'] });
  fs.unlinkSync(p);
});

test('mergeHooks injects the three ping hooks and preserves other keys', () => {
  const out = mergeHooks({ theme: 'dark' }, 'claude-status-ping');
  assert.strictEqual(out.theme, 'dark');
  assert.strictEqual(out.hooks.UserPromptSubmit[0].hooks[0].command, 'claude-status-ping start');
  assert.strictEqual(out.hooks.Stop[0].hooks[0].command, 'claude-status-ping stop');
  assert.strictEqual(out.hooks.Notification[0].hooks[0].command, 'claude-status-ping waiting');
});

test('mergeHooks is idempotent and keeps a pre-existing user hook', () => {
  const before = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'user-thing' }] }] } };
  const once = mergeHooks(before, 'claude-status-ping');
  const twice = mergeHooks(once, 'claude-status-ping');
  // user hook still present
  assert.ok(twice.hooks.Stop.some(e => e.hooks.some(h => h.command === 'user-thing')));
  // exactly one ping stop entry (no duplication on re-install)
  const pingStops = twice.hooks.Stop.filter(e => e.hooks.some(h => h.command === 'claude-status-ping stop'));
  assert.strictEqual(pingStops.length, 1);
});

test('stripHooks removes exactly our entries, leaving user hooks intact', () => {
  const merged = mergeHooks({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'user-thing' }] }] } }, 'claude-status-ping');
  const stripped = stripHooks(merged, 'claude-status-ping');
  assert.ok(stripped.hooks.Stop.some(e => e.hooks.some(h => h.command === 'user-thing')));
  assert.ok(!stripped.hooks.Stop.some(e => e.hooks.some(h => h.command === 'claude-status-ping stop')));
  assert.ok(!('UserPromptSubmit' in (stripped.hooks || {})));
});
