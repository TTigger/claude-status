const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runInstall } = require('../src/installer/install');

function tmpHome() {
  const h = path.join(os.tmpdir(), 'cs-home-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(path.join(h, '.claude'), { recursive: true });
  return h;
}

test('install writes config + statusLine, preserves existing settings, backs up', () => {
  const home = tmpHome();
  const sp = path.join(home, '.claude', 'settings.json');
  fs.writeFileSync(sp, JSON.stringify({ permissions: { allow: ['keepme'] } }));
  const summary = runInstall({
    home, env: { COLORTERM: 'truecolor', WT_SESSION: '1' }, platform: 'linux',
    style: null, refreshInterval: 30, globalInstall: () => {}, resolveCc: () => null,
  });
  const settings = JSON.parse(fs.readFileSync(sp, 'utf8'));
  assert.deepStrictEqual(settings.permissions, { allow: ['keepme'] });
  assert.strictEqual(settings.statusLine.command, 'claude-status-render');
  assert.ok(fs.existsSync(path.join(home, '.claude', 'settings.json.bak')));
  const cfg = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'claude-status.config.json'), 'utf8'));
  assert.strictEqual(cfg.style, 'claude'); // recommended for truecolor caps
  assert.strictEqual(summary.recommendedStyle, 'claude');
});

test('--style overrides recommendation', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: {}, platform: 'win32', style: 'ascii', refreshInterval: 30,
    globalInstall: () => {}, resolveCc: () => null,
  });
  assert.strictEqual(summary.chosenStyle, 'ascii');
});

test('dry run reports the plan but makes no filesystem changes', () => {
  // fresh home WITHOUT a .claude dir, so we can assert nothing gets created
  const home = path.join(os.tmpdir(), 'cs-dry-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(home, { recursive: true });
  let globalInstallCalled = false;
  const summary = runInstall({
    home, env: { COLORTERM: 'truecolor', WT_SESSION: '1' }, platform: 'linux',
    style: 'tech', refreshInterval: 30,
    globalInstall: () => { globalInstallCalled = true; }, resolveCc: () => null,
    dryRun: true,
  });
  assert.strictEqual(summary.dryRun, true);
  assert.strictEqual(summary.chosenStyle, 'tech');
  assert.strictEqual(summary.recommendedStyle, 'claude');
  assert.strictEqual(globalInstallCalled, false, 'dry run must not run the global install');
  assert.ok(!fs.existsSync(path.join(home, '.claude')), 'dry run must not create .claude');
});

test('csCollision is true when resolveCs finds coursier on PATH', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: {}, platform: 'linux',
    style: null, refreshInterval: 30,
    globalInstall: () => {},
    resolveCc: () => null,
    resolveCs: () => '/usr/local/bin/cs',
  });
  assert.strictEqual(summary.csCollision, true);
});

test('csCollision is false when resolveCs returns null', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: {}, platform: 'linux',
    style: null, refreshInterval: 30,
    globalInstall: () => {},
    resolveCc: () => null,
    resolveCs: () => null,
  });
  assert.strictEqual(summary.csCollision, false);
});

test('install injects ping hooks by default and reports pingInstalled', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: { COLORTERM: 'truecolor', WT_SESSION: '1' }, platform: 'linux',
    style: null, refreshInterval: 30, globalInstall: () => {}, resolveCc: () => null,
  });
  assert.strictEqual(summary.pingInstalled, true);
  const settings = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
  assert.strictEqual(settings.hooks.Stop[0].hooks[0].command, 'claude-status-ping stop');
});

test('--no-ping skips hook injection', () => {
  const home = tmpHome();
  const summary = runInstall({
    home, env: {}, platform: 'linux', style: null, refreshInterval: 30,
    globalInstall: () => {}, resolveCc: () => null, noPing: true,
  });
  assert.strictEqual(summary.pingInstalled, false);
  const settings = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
  assert.ok(!settings.hooks);
});

test('dry run does not write ping hooks', () => {
  const home = path.join(os.tmpdir(), 'cs-dryping-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(home, { recursive: true });
  const summary = runInstall({
    home, env: {}, platform: 'linux', style: null, refreshInterval: 30,
    globalInstall: () => {}, resolveCc: () => null, dryRun: true,
  });
  assert.strictEqual(summary.pingInstalled, true); // intent reported
  assert.ok(!fs.existsSync(path.join(home, '.claude')), 'dry run writes nothing');
});
