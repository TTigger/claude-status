const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { aliasSnippet, ccCollides, detectShell, writeAlias } = require('../src/installer/alias');

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

test('detectShell win32 returns powershell with null profilePath', () => {
  const result = detectShell({}, 'win32');
  assert.strictEqual(result.shell, 'powershell');
  assert.strictEqual(result.profilePath, null);
});

test('detectShell zsh on linux returns correct shell and profilePath', () => {
  const result = detectShell({ SHELL: '/bin/zsh', HOME: '/home/u' }, 'linux');
  assert.strictEqual(result.shell, 'zsh');
  assert.ok(result.profilePath.endsWith('.zshrc'), `profilePath should end with .zshrc, got: ${result.profilePath}`);
  assert.ok(result.profilePath.includes('/home/u'), `profilePath should contain /home/u, got: ${result.profilePath}`);
});

test('detectShell bash on linux returns correct shell and profilePath', () => {
  const result = detectShell({ SHELL: '/bin/bash', HOME: '/home/u' }, 'linux');
  assert.strictEqual(result.shell, 'bash');
  assert.ok(result.profilePath.endsWith('.bashrc'), `profilePath should end with .bashrc, got: ${result.profilePath}`);
  assert.ok(result.profilePath.includes('/home/u'), `profilePath should contain /home/u, got: ${result.profilePath}`);
});

test('writeAlias writes alias to temp file on first call', () => {
  const tmpFile = path.join(os.tmpdir(), `alias-test-${process.pid}-${performance.now()}.sh`);
  try {
    const result = writeAlias(tmpFile, 'bash', 'clc');
    assert.strictEqual(result.written, true);
    assert.strictEqual(result.reason, 'written');
    assert.strictEqual(result.profilePath, tmpFile);
    const content = fs.readFileSync(tmpFile, 'utf8');
    assert.ok(content.includes("alias clc='cc'"), `File should contain the snippet, got: ${content}`);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('writeAlias is idempotent — second call returns exists and does not duplicate', () => {
  const tmpFile = path.join(os.tmpdir(), `alias-test-${process.pid}-${performance.now()}.sh`);
  try {
    writeAlias(tmpFile, 'bash', 'clc');
    const result = writeAlias(tmpFile, 'bash', 'clc');
    assert.strictEqual(result.written, false);
    assert.strictEqual(result.reason, 'exists');
    const content = fs.readFileSync(tmpFile, 'utf8');
    const snippet = "alias clc='cc'";
    const occurrences = content.split(snippet).length - 1;
    assert.strictEqual(occurrences, 1, `Snippet should appear exactly once, found ${occurrences} times`);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('writeAlias with null profilePath returns no-profile for powershell', () => {
  const result = writeAlias(null, 'powershell', 'clc');
  assert.strictEqual(result.written, false);
  assert.strictEqual(result.reason, 'no-profile');
  assert.strictEqual(result.snippet, 'Set-Alias clc cc');
  assert.strictEqual(result.profilePath, null);
});
