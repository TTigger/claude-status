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

const PING_HOOKS = [
  { event: 'UserPromptSubmit', arg: 'start' },
  { event: 'Stop', arg: 'stop' },
  { event: 'Notification', arg: 'waiting' },
];

function mergeHooks(settings, command) {
  const next = { ...settings, hooks: { ...(settings.hooks || {}) } };
  for (const { event, arg } of PING_HOOKS) {
    const cmd = `${command} ${arg}`;
    const arr = Array.isArray(next.hooks[event]) ? next.hooks[event].slice() : [];
    const exists = arr.some(entry => (entry.hooks || []).some(h => h.command === cmd));
    if (!exists) arr.push({ hooks: [{ type: 'command', command: cmd }] });
    next.hooks[event] = arr;
  }
  return next;
}

function stripHooks(settings, command) {
  if (!settings || !settings.hooks) return settings;
  const next = { ...settings, hooks: { ...settings.hooks } };
  for (const { event, arg } of PING_HOOKS) {
    const cmd = `${command} ${arg}`;
    if (!Array.isArray(next.hooks[event])) continue;
    const filtered = next.hooks[event]
      .map(entry => ({ ...entry, hooks: (entry.hooks || []).filter(h => h.command !== cmd) }))
      .filter(entry => (entry.hooks || []).length > 0);
    if (filtered.length) next.hooks[event] = filtered; else delete next.hooks[event];
  }
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  return next;
}

module.exports = { mergeStatusLine, readSettings, writeSettingsWithBackup, mergeHooks, stripHooks };
