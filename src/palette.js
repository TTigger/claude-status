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
  return { low, mid, high, dim: '\x1b[2m', reset: '\x1b[0m', fgReset: '\x1b[39m' };
}

function colorize(text, tierName, palette) {
  return palette[tierName] + text + palette.fgReset;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
// 標準 xterm-256：6x6x6 cube (16-231) + grayscale ramp (232-255)
function rgbTo256(r, g, b) {
  const toCube = (v) => v < 48 ? 0 : v < 115 ? 1 : Math.floor((v - 35) / 40);
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return 16 + 36 * toCube(r) + 6 * toCube(g) + toCube(b);
}
function fgCode(hex, caps) {
  const [r, g, b] = hexToRgb(hex);
  if (caps && caps.truecolor) return `\x1b[38;2;${r};${g};${b}m`;
  if (caps && caps.color256) return `\x1b[38;5;${rgbTo256(r, g, b)}m`;
  return '';
}
function bgCode(hex, caps) {
  const [r, g, b] = hexToRgb(hex);
  if (caps && caps.truecolor) return `\x1b[48;2;${r};${g};${b}m`;
  if (caps && caps.color256) return `\x1b[48;5;${rgbTo256(r, g, b)}m`;
  return '';
}

const FG_RESET = '\x1b[39m';
const RESET = '\x1b[0m';
// 無色終端的 tier 8 色 fallback
const TIER8 = { low: '\x1b[32m', mid: '\x1b[33m', high: '\x1b[31m' };

function resolveStylePalette(style, theme, caps) {
  const t = theme === 'light' ? 'light' : 'dark';
  const roles = (style.palette && style.palette[t]) || {};
  const hasColor = !!(caps && (caps.truecolor || caps.color256));
  const fc = (hex) => (hex ? fgCode(hex, caps) : '');
  const out = {
    fgReset: FG_RESET,
    reset: RESET,
    dim: fc(roles.dim) || '\x1b[2m',
    text: fc(roles.text),
    accent: fc(roles.accent),
    accent2: fc(roles.accent2),
    low: hasColor ? fc(roles.low) : TIER8.low,
    mid: hasColor ? fc(roles.mid) : TIER8.mid,
    high: hasColor ? fc(roles.high) : TIER8.high,
    deco: {},
  };
  if (hasColor && roles.deco) {
    for (const [k, pair] of Object.entries(roles.deco)) {
      out.deco[k] = { bg: bgCode(pair.bg, caps), fg: fgCode(pair.fg, caps) };
    }
  }
  return out;
}

module.exports = { resolvePalette, colorize, fgCode, bgCode, hexToRgb, rgbTo256, resolveStylePalette };
