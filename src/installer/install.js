const fs = require('node:fs');
const path = require('node:path');
const { settingsPath, configPath, backupPath, claudeDir } = require('./paths');
const { mergeStatusLine, readSettings, writeSettingsWithBackup } = require('./settings');
const { capabilities, recommendStyle } = require('../detect');
const { ccCollides } = require('./alias');
const { CONFIG_SCHEMA } = require('../registry');

function runInstall(opts) {
  const { home, env, platform, style, refreshInterval, globalInstall, resolveCc, dryRun } = opts;

  const caps = capabilities(env, platform);
  const recommended = recommendStyle(caps);
  const chosen = style || recommended;
  const cp = configPath(home);
  const refresh = refreshInterval || CONFIG_SCHEMA.refreshIntervalSec.default;

  // --dry-run reports what would happen but touches nothing on disk (spec §8).
  if (!dryRun) {
    fs.mkdirSync(claudeDir(home), { recursive: true });

    if (typeof globalInstall === 'function') globalInstall(); // npm i -g (no-op in tests)

    // write config only if absent, to preserve user edits
    if (!fs.existsSync(cp)) {
      fs.writeFileSync(cp, JSON.stringify({ style: chosen }, null, 2) + '\n');
    } else if (style) {
      const raw = JSON.parse(fs.readFileSync(cp, 'utf8'));
      raw.style = chosen;
      fs.writeFileSync(cp, JSON.stringify(raw, null, 2) + '\n');
    }

    const next = mergeStatusLine(readSettings(settingsPath(home)), 'claude-status-render', refresh);
    writeSettingsWithBackup(settingsPath(home), backupPath(home), next);
  }

  return {
    recommendedStyle: recommended,
    chosenStyle: chosen,
    caps,
    ccCollision: ccCollides(platform, resolveCc || (() => null)),
    settingsPath: settingsPath(home),
    configPath: cp,
    dryRun: !!dryRun,
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
