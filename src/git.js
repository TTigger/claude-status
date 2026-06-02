const { execFileSync } = require('node:child_process');

function currentBranch(cwd) {
  try {
    const out = execFileSync('git', ['branch', '--show-current'],
      { cwd, timeout: 500, stdio: ['ignore', 'pipe', 'ignore'] });
    const b = out.toString().trim();
    return b || null;
  } catch {
    return null;
  }
}

module.exports = { currentBranch };
