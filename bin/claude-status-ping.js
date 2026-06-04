#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { loadConfig } = require('../src/config');
const { runPing } = require('../src/ping/run');

function readStdin() { try { return fs.readFileSync(0, 'utf8'); } catch { return ''; } }

function main() {
  const arg = process.argv[2] || 'stop';
  let stdin = {};
  try { stdin = JSON.parse(readStdin().replace(/^﻿/, '')) || {}; } catch { stdin = {}; }
  const claudeDir = path.join(os.homedir(), '.claude');
  const config = loadConfig(path.join(claudeDir, 'claude-status.config.json'));
  const statePath = path.join(claudeDir, 'claude-status-ping.state.json');
  const now = Math.floor(Date.now() / 1000);
  try {
    runPing({ arg, stdin, config, now, statePath, spawn, platform: process.platform, env: process.env, stderr: process.stderr });
  } catch { /* never break the session */ }
  process.exit(0);
}
main();
