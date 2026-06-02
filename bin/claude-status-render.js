#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { renderHud } = require('../src/render');
const { loadConfig } = require('../src/config');
const { capabilities } = require('../src/detect');
const { currentBranch } = require('../src/git');

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
function readTheme(settingsPath) {
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, ''));
    return /^light/.test(s.theme || '') ? 'light' : 'dark';
  } catch { return 'dark'; }
}

function main() {
  let stdin = {};
  try { stdin = JSON.parse(readStdin()) || {}; } catch { stdin = {}; }
  const claudeDir = path.join(os.homedir(), '.claude');
  const config = loadConfig(path.join(claudeDir, 'claude-status.config.json'));
  const theme = readTheme(path.join(claudeDir, 'settings.json'));
  const caps = capabilities(process.env, process.platform);
  const columns = parseInt(process.env.COLUMNS, 10) || 100;
  const cwd = (stdin.workspace && stdin.workspace.current_dir) || process.cwd();
  const branch = config.elements.gitBranch ? currentBranch(cwd) : null;
  const now = Math.floor(Date.now() / 1000);
  try {
    process.stdout.write(renderHud({ stdin, config, theme, caps, columns, now, branch }));
  } catch {
    // never break the user's session; print nothing on unexpected error
  }
}
main();
