function capabilities(env, platform) {
  const truecolor = /^(truecolor|24bit)$/i.test(env.COLORTERM || '');
  const color256 = truecolor || /256/.test(env.TERM || '');
  const unicode = platform !== 'win32' || !!env.WT_SESSION;
  // Nerd Font cannot be reliably auto-detected; honor explicit opt-in.
  const nerd = env.CLAUDE_STATUS_NERD === '1';
  return { truecolor, color256, unicode, nerd };
}

function recommendStyle(caps) {
  if (!caps.unicode) return 'ascii';
  if (caps.nerd) return 'tech';
  if (caps.truecolor || caps.color256) return 'claude';
  return 'classic';
}

module.exports = { capabilities, recommendStyle };
