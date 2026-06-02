const C256 = {
  traffic: {
    light: { low: 28, mid: 166, high: 160 },
    dark: { low: 40, mid: 220, high: 196 },
  },
  coral: {
    light: { low: 216, mid: 173, high: 167 },
    dark: { low: 216, mid: 173, high: 167 },
  },
};
const C8 = {
  traffic: { low: 32, mid: 33, high: 31 },
  coral: { low: 33, mid: 33, high: 31 },
};

function code256(n) { return `\x1b[38;5;${n}m`; }
function code8(n) { return `\x1b[${n}m`; }

function resolvePalette(mode, theme, caps) {
  const t = theme === 'light' ? 'light' : 'dark';
  let low, mid, high;
  if (caps && caps.color256) {
    const set = C256[mode][t];
    low = code256(set.low); mid = code256(set.mid); high = code256(set.high);
  } else {
    const set = C8[mode];
    low = code8(set.low); mid = code8(set.mid); high = code8(set.high);
  }
  return { low, mid, high, dim: '\x1b[2m', reset: '\x1b[0m' };
}

function colorize(text, tierName, palette) {
  return palette[tierName] + text + palette.reset;
}

module.exports = { resolvePalette, colorize };
