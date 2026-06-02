#!/usr/bin/env node
const os = require('node:os');
const { execSync } = require('node:child_process');
const { configPath } = require('../src/installer/paths');
const { runInstall, runUninstall } = require('../src/installer/install');
const { loadConfig, getDotted, setConfig, resetConfig } = require('../src/config');
const { CONFIG_SCHEMA, STYLES, LAYOUTS } = require('../src/registry');
const { renderSample, galleryLine } = require('../src/preview');
const { HELP, topicHelp } = require('../src/help');
const { detectShell, writeAlias } = require('../src/installer/alias');

function parseFlags(args) {
  const flags = {}; const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
    else positional.push(args[i]);
  }
  return { flags, positional };
}

function applyConfigValue(key, value) {
  const cp = configPath(os.homedir());
  const r = setConfig(cp, key, value);
  if (!r.ok) { console.error(r.error); process.exit(1); }
  console.log(`✓ ${key} → ${r.value}. 目前效果：`);
  const cfg = loadConfig(cp);
  console.log(renderSample({ style: cfg.style, layout: cfg.layout, columns: parseInt(process.env.COLUMNS, 10) || 100 }));
}

function cmdInstall(flags) {
  const summary = runInstall({
    home: os.homedir(), env: process.env, platform: process.platform,
    style: typeof flags.style === 'string' ? flags.style : null,
    refreshInterval: 30,
    dryRun: !!flags['dry-run'],
    globalInstall: () => {
      try { execSync('npm install -g @ttigger/claude-status', { stdio: 'ignore' }); } catch {}
    },
    resolveCc: () => { try { return execSync('command -v cc', { stdio: ['ignore','pipe','ignore'] }).toString().trim() || null; } catch { return null; } },
  });
  if (summary.dryRun) {
    console.log(`[dry-run] no changes written. Would install style=${summary.chosenStyle} (recommended ${summary.recommendedStyle})`);
    console.log(`[dry-run] would update ${summary.settingsPath} (with .bak) and write ${summary.configPath}`);
  } else {
    console.log(`✓ installed. style=${summary.chosenStyle} (recommended ${summary.recommendedStyle})`);
  }
  if (summary.ccCollision) console.log('⚠ "cc" already exists on PATH (C compiler?). Consider: claude-status install --alias clc');
  console.log(summary.dryRun ? 'Preview:' : 'Open a new Claude Code session to see the HUD. Preview now:');
  console.log(renderSample({ style: summary.chosenStyle, columns: parseInt(process.env.COLUMNS,10) || 100 }));
  if (typeof flags.alias === 'string') {
    doAlias(flags.alias);
  }
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

function cmdStyle(positional) {
  const cp = configPath(os.homedir());
  if (!positional[0]) {
    const cfg = loadConfig(cp);
    const currentStyle = cfg.style;
    console.log('Styles (● = current):');
    for (const s of STYLES) {
      console.log(`  ${s.name === currentStyle ? '●' : '○'} ${s.name.padEnd(8)} ${galleryLine(s.name, 80)}`);
    }
    return;
  }
  applyConfigValue('style', positional[0]);
}

function cmdLayout(positional) {
  const cp = configPath(os.homedir());
  if (!positional[0]) {
    const cfg = loadConfig(cp);
    console.log(`Current layout: ${cfg.layout}. Available: ${LAYOUTS.map(l => l.name).join(', ')}`);
    return;
  }
  applyConfigValue('layout', positional[0]);
}

function doAlias(name) {
  const { shell, profilePath } = detectShell(process.env, process.platform);
  const r = writeAlias(profilePath, shell, name);
  if (r.reason === 'written') {
    console.log(`✓ alias ${name} → cc added to ${r.profilePath}. Restart your shell (or source it) to use it.`);
  } else if (r.reason === 'exists') {
    console.log(`✓ alias ${name} already present in ${r.profilePath}.`);
  } else if (r.reason === 'no-profile') {
    console.log(`Add this line to your PowerShell $PROFILE to enable the alias:`);
    console.log('  ' + r.snippet);
  }
}

function cmdAlias(positional) {
  const name = positional[0];
  if (!name) { console.error('Usage: claude-status alias <name>'); process.exit(1); }
  doAlias(name);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    console.log(HELP); return;
  }
  if (argv[0] === 'help') {
    if (argv[1]) { console.log(topicHelp(argv[1])); return; }
    console.log(HELP); return;
  }
  if (argv[0] === '--version') { console.log(require('../package.json').version); return; }
  const { flags, positional } = parseFlags(argv.slice(1));
  switch (argv[0]) {
    case 'install': return cmdInstall(flags);
    case 'uninstall': runUninstall({ home: os.homedir() }); console.log('✓ uninstalled'); return;
    case 'config': return cmdConfig(positional, flags);
    case 'preview': return cmdPreview(flags);
    case 'style': return cmdStyle(positional);
    case 'layout': return cmdLayout(positional);
    case 'alias': return cmdAlias(positional);
    default: console.error(`Unknown command: ${argv[0]}`); console.log(HELP); process.exit(1);
  }
}
main();
