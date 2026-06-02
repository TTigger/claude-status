const fs = require('node:fs');

function mergeStatusLine(settings, command, refreshInterval) {
  return { ...settings, statusLine: { type: 'command', command, refreshInterval } };
}

function readSettings(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeSettingsWithBackup(settingsPath, backupPath, nextObj) {
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, backupPath);
  }
  fs.mkdirSync(require('node:path').dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(nextObj, null, 2) + '\n');
}

module.exports = { mergeStatusLine, readSettings, writeSettingsWithBackup };
