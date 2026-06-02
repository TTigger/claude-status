const fs = require('node:fs');

function mergeStatusLine(settings, command, refreshInterval) {
  return { ...settings, statusLine: { type: 'command', command, refreshInterval } };
}

function readSettings(p) {
  // Strip a leading UTF-8 BOM (some editors add one) so JSON.parse doesn't throw
  // and silently discard the user's existing settings on merge.
  try { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return {}; }
}

function writeSettingsWithBackup(settingsPath, backupPath, nextObj) {
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, backupPath);
  }
  fs.mkdirSync(require('node:path').dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(nextObj, null, 2) + '\n');
}

module.exports = { mergeStatusLine, readSettings, writeSettingsWithBackup };
