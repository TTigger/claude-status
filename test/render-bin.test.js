const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { SAMPLE } = require('../src/fixtures');

test('render bin reads stdin JSON and prints a HUD line', () => {
  const bin = path.join(__dirname, '..', 'bin', 'claude-status-render.js');
  const out = execFileSync('node', [bin], {
    input: JSON.stringify(SAMPLE),
    env: { ...process.env, COLUMNS: '200', COLORTERM: 'truecolor', WT_SESSION: '1' },
  }).toString();
  const plain = out.replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(plain.includes('Opus 4.8'));
  assert.ok(plain.includes('%'));
});

test('render bin tolerates empty/garbage stdin', () => {
  const bin = path.join(__dirname, '..', 'bin', 'claude-status-render.js');
  const out = execFileSync('node', [bin], { input: 'not json' }).toString();
  assert.ok(typeof out === 'string'); // no crash, exit 0
});
