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
