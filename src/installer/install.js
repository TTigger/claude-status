const fs = require('node:fs');
const path = require('node:path');
const { settingsPath, configPath, backupPath, claudeDir } = require('./paths');
const { mergeStatusLine, readSettings, writeSettingsWithBackup } = require('./settings');
const { capabilities, recommendStyle } = require('../detect');
const { ccCollides } = require('./alias');
const { CONFIG_SCHEMA } = require('../registry');

function runInstall(opts) {
  const { home, env, platform, style, refreshInterval, globalInstall, resolveCc } = opts;
  fs.mkdirSync(claudeDir(home), { recursive: true });

  if (typeof globalInstall === 'function') globalInstall(); // npm i -g (no-op in tests)

  const caps = capabilities(env, platform);
  const recommended = recommendStyle(caps);
  const chosen = style || recommended;

  // write config only if absent, to preserve user edits
  const cp = configPath(home);
  if (!fs.existsSync(cp)) {
    fs.writeFileSync(cp, JSON.stringify({ style: chosen }, null, 2) + '\n');
  } else if (style) {
    const raw = JSON.parse(fs.readFileSync(cp, 'utf8'));
    raw.style = chosen;
    fs.writeFileSync(cp, JSON.stringify(raw, null, 2) + '\n');
  }

  const refresh = refreshInterval || CONFIG_SCHEMA.refreshIntervalSec.default;
  const next = mergeStatusLine(readSettings(settingsPath(home)), 'claude-status-render', refresh);
  writeSettingsWithBackup(settingsPath(home), backupPath(home), next);

  return {
    recommendedStyle: recommended,
    chosenStyle: chosen,
    caps,
    ccCollision: ccCollides(platform, resolveCc || (() => null)),
    settingsPath: settingsPath(home),
    configPath: cp,
  };
}

function runUninstall(opts) {
  const { home } = opts;
  const sp = settingsPath(home), bp = backupPath(home);
  if (fs.existsSync(bp)) {
    fs.copyFileSync(bp, sp);
    return { restored: true };
  }
  // no backup: just strip statusLine
  const s = readSettings(sp);
  delete s.statusLine;
  fs.writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
  return { restored: false };
}

module.exports = { runInstall, runUninstall };
