#!/usr/bin/env node
const os = require('node:os');
const { execSync } = require('node:child_process');
const { configPath } = require('../src/installer/paths');
const { runInstall, runUninstall } = require('../src/installer/install');
const { loadConfig, getDotted, setConfig, resetConfig } = require('../src/config');
const { CONFIG_SCHEMA, STYLES, LAYOUTS } = require('../src/registry');
const { renderSample, galleryLine } = require('../src/preview');

function parseFlags(args) {
  const flags = {}; const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
    else positional.push(args[i]);
  }
  return { flags, positional };
}

const HELP = `claude-status — Claude Code usage HUD + cc launcher

Usage:
  claude-status install [--style <name>] [--alias <name>] [--dry-run]
  claude-status uninstall
  claude-status config set <key> <value>
  claude-status config get <key>
  claude-status config list
  claude-status config reset [<key>]
  claude-status preview [--style <name>] [--layout <name>]
  claude-status help [styles|layout|colors|cc|troubleshooting]

Styles: ${STYLES.map(s => s.name).join(', ')}
Layouts: ${LAYOUTS.map(l => l.name).join(', ')}`;

function cmdInstall(flags) {
  const summary = runInstall({
    home: os.homedir(), env: process.env, platform: process.platform,
    style: typeof flags.style === 'string' ? flags.style : null,
    refreshInterval: 30,
    globalInstall: flags['dry-run'] ? () => {} : () => {
      try { execSync('npm install -g @ttigger/claude-status', { stdio: 'ignore' }); } catch {}
    },
    resolveCc: () => { try { return execSync('command -v cc', { stdio: ['ignore','pipe','ignore'] }).toString().trim() || null; } catch { return null; } },
  });
  console.log(`✓ installed. style=${summary.chosenStyle} (recommended ${summary.recommendedStyle})`);
  if (summary.ccCollision) console.log('⚠ "cc" already exists on PATH (C compiler?). Consider: claude-status install --alias clc');
  console.log('Open a new Claude Code session to see the HUD. Preview now:');
  console.log(renderSample({ style: summary.chosenStyle, columns: parseInt(process.env.COLUMNS,10) || 100 }));
}

function cmdConfig(positional, flags) {
  const sub = positional[0];
  const cp = configPath(os.homedir());
  if (sub === 'set') {
    const [, key, value] = positional;
    const r = setConfig(cp, key, value);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    console.log(`✓ ${key} → ${r.value}. 目前效果：`);
    const cfg = loadConfig(cp);
    console.log(renderSample({ style: cfg.style, layout: cfg.layout, columns: parseInt(process.env.COLUMNS,10) || 100 }));
    return;
  }
  if (sub === 'get') { console.log(getDotted(loadConfig(cp), positional[1])); return; }
  if (sub === 'reset') { const r = resetConfig(cp, positional[1]); if (!r.ok){console.error(r.error);process.exit(1);} console.log('✓ reset'); return; }
  if (sub === 'list') {
    const cfg = loadConfig(cp);
    for (const [key, spec] of Object.entries(CONFIG_SCHEMA)) {
      const cur = getDotted(cfg, key);
      const choices = spec.choices ? ` choices: ${spec.choices.join('|')}` : (spec.min!=null?` range: ${spec.min}-${spec.max}`:'');
      console.log(`${key} = ${cur}${choices}`);
    }
    console.log('\nStyles preview:');
    for (const s of STYLES) console.log(`  ${s.name === cfg.style ? '●' : '○'} ${s.name.padEnd(8)} ${galleryLine(s.name, 80)}`);
    return;
  }
  console.error('Unknown config subcommand. See: claude-status help'); process.exit(1);
}

function cmdPreview(flags) {
  console.log(renderSample({
    style: typeof flags.style === 'string' ? flags.style : undefined,
    layout: typeof flags.layout === 'string' ? flags.layout : undefined,
    columns: parseInt(process.env.COLUMNS, 10) || 100,
  }));
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    console.log(HELP); return;
  }
  if (argv[0] === '--version') { console.log(require('../package.json').version); return; }
  const { flags, positional } = parseFlags(argv.slice(1));
  switch (argv[0]) {
    case 'install': return cmdInstall(flags);
    case 'uninstall': runUninstall({ home: os.homedir() }); console.log('✓ uninstalled'); return;
    case 'config': return cmdConfig(positional, flags);
    case 'preview': return cmdPreview(flags);
    default: console.error(`Unknown command: ${argv[0]}`); console.log(HELP); process.exit(1);
  }
}
main();
