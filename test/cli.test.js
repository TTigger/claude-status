const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const bin = path.join(__dirname, '..', 'bin', 'claude-status.js');
const run = (args, env) => execFileSync(process.execPath, [bin, ...args],
  { env: { ...process.env, ...env } }).toString();

function makeTmpHome() {
  const dir = path.join(os.tmpdir(), 'cs-cli-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  return dir;
}

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

// --- new tests ---

test('style with no args lists style names', () => {
  const out = run(['style']).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('claude'));
  assert.ok(out.includes('ascii'));
  assert.ok(out.includes('emoji'));
});

test('style ascii sets style and previews', () => {
  const home = makeTmpHome();
  const out = run(['style', 'ascii'], { HOME: home, USERPROFILE: home }).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('ascii'), `expected 'ascii' in: ${out}`);
  assert.ok(out.includes('Opus 4.8'), `expected preview in: ${out}`);
});

test('style nope exits non-zero and reports Invalid value', () => {
  const home = makeTmpHome();
  try {
    run(['style', 'nope'], { HOME: home, USERPROFILE: home });
    assert.fail('should have thrown');
  } catch (e) {
    const combined = e.stderr.toString() + e.stdout.toString();
    assert.ok(combined.includes('Invalid value'), `expected 'Invalid value' in: ${combined}`);
  }
});

test('layout two succeeds', () => {
  const home = makeTmpHome();
  const out = run(['layout', 'two'], { HOME: home, USERPROFILE: home }).replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(out.includes('two') || out.includes('layout'), `expected 'two' or 'layout' in: ${out}`);
});

test('help cc includes alias', () => {
  const out = run(['help', 'cc']);
  assert.ok(out.includes('alias'), `expected 'alias' in: ${out}`);
});

test('help styles includes a style name', () => {
  const out = run(['help', 'styles']);
  assert.ok(out.includes('claude') || out.includes('ascii'), `expected style name in: ${out}`);
});

test('alias clc mentions clc in output', () => {
  const home = makeTmpHome();
  const out = run(['alias', 'clc'], { HOME: home, USERPROFILE: home, SHELL: '/bin/bash' });
  assert.ok(out.includes('clc'), `expected 'clc' in: ${out}`);
});

test('alias qq --for self writes claude-status alias', () => {
  const home = makeTmpHome();
  const out = run(['alias', 'qq', '--for', 'self'], { HOME: home, USERPROFILE: home, SHELL: '/bin/bash' });
  assert.ok(out.includes('claude-status'), `expected 'claude-status' in: ${out}`);
  assert.ok(out.includes('qq'), `expected 'qq' in: ${out}`);
});

test('alias zz --for bogus exits non-zero and mentions --for', () => {
  const home = makeTmpHome();
  try {
    run(['alias', 'zz', '--for', 'bogus'], { HOME: home, USERPROFILE: home, SHELL: '/bin/bash' });
    assert.fail('should have thrown');
  } catch (e) {
    const combined = e.stderr.toString() + e.stdout.toString();
    assert.ok(combined.includes('--for'), `expected '--for' in: ${combined}`);
  }
});

test('help cc includes cs and --for self', () => {
  const out = run(['help', 'cc']);
  assert.ok(out.includes('cs'), `expected 'cs' in: ${out}`);
  assert.ok(out.includes('--for self'), `expected '--for self' in: ${out}`);
});
