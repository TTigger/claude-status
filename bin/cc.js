#!/usr/bin/env node
const { spawn } = require('node:child_process');

const target = process.env.CLAUDE_STATUS_CLAUDE_BIN || 'claude';
const child = spawn(target, process.argv.slice(2), { stdio: 'inherit', shell: false });

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    process.stderr.write(`cc: could not find "${target}" on PATH. Is Claude Code installed?\n`);
    process.exit(127);
  }
  process.stderr.write(`cc: failed to launch claude: ${err.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code == null ? 0 : code);
});
