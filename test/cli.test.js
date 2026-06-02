const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const bin = path.join(__dirname, '..', 'bin', 'claude-status.js');
const run = (args, env) => execFileSync(process.execPath, [bin, ...args],
  { env: { ...process.env, ...env } }).toString();

test('--help lists commands', () => {
  const out = run(['--help']);
  assert.ok(out.includes('install'));
  assert.ok(out.includes('config'));
  assert.ok(out.includes('preview'));
});

test('preview prints a HUD', () => {
  const out = run(['preview', '--style', 'ascii']).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('Opus 4.8'));
});

test('config list shows style choices', () => {
  const out = run(['config', 'list']).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('style'));
  assert.ok(out.includes('claude'));
  assert.ok(out.includes('tech'));
});

test('config set rejects invalid style with exit 1', () => {
  try { run(['config', 'set', 'style', 'nope'], { HOME: require('os').tmpdir() }); assert.fail(); }
  catch (e) { assert.ok((e.stderr.toString() + e.stdout.toString()).includes('Invalid value')); }
});
