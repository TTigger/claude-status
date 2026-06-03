const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function aliasSnippet(shell, name, target = 'cc') {
  if (shell === 'powershell') return `Set-Alias ${name} ${target}`;
  return `alias ${name}='${target}'`;
}

// resolver() returns a path string if `cc` exists on PATH, else null.
function ccCollides(platform, resolver) {
  if (platform === 'win32') return false; // no C-compiler `cc` collision on Windows
  return !!resolver();
}

function detectShell(env, platform) {
  if (platform === 'win32') {
    return { shell: 'powershell', profilePath: null };
  }
  const home = env.HOME || os.homedir();
  const shellEnv = env.SHELL || '';
  if (shellEnv.includes('zsh')) {
    return { shell: 'zsh', profilePath: path.posix.join(home, '.zshrc') };
  }
  return { shell: 'bash', profilePath: path.posix.join(home, '.bashrc') };
}

function writeAlias(profilePath, shell, name, target = 'cc') {
  const snippet = aliasSnippet(shell, name, target);
  if (profilePath === null) {
    return { written: false, reason: 'no-profile', snippet, profilePath: null };
  }
  let existing = '';
  try {
    existing = fs.readFileSync(profilePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (existing.includes(snippet)) {
    return { written: false, reason: 'exists', snippet, profilePath };
  }
  const block = `\n# claude-status alias\n${snippet}\n`;
  fs.writeFileSync(profilePath, existing + block, 'utf8');
  return { written: true, reason: 'written', snippet, profilePath };
}

module.exports = { aliasSnippet, ccCollides, detectShell, writeAlias };
