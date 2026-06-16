const { bar, tier, humanizeDuration, tokensK } = require('./format');
const { colorize } = require('./palette');

function formatUsd(usd) {
  const n = typeof usd === 'number' ? usd : 0;
  return '$' + (n < 1 ? n.toFixed(4) : n.toFixed(2));
}

function renderMetric({ label, pct, suffix, style, palette, thresholds, barWidth }) {
  const tierName = tier(pct, thresholds);
  const glyphs = style.bar;
  const [open, close] = style.barWrap;
  const filledStr = bar(pct, barWidth, { full: glyphs.full, empty: glyphs.empty });
  // color the whole bar interior + percent by tier; brackets/label uncolored
  const coloredBar = open + colorize(filledStr, tierName, palette) + close;
  const coloredPct = colorize(`${pct}%`, tierName, palette);
  const parts = [label, coloredBar, coloredPct];
  if (suffix) parts.push(suffix);
  return parts.filter(Boolean).join(' ');
}

function fmtReset(resetsAt, now, precision) {
  if (!resetsAt) return '';
  const d = humanizeDuration(resetsAt - now);
  if (precision === 'short') return d.replace(/^(\d+[dh])\d+[hm]$/, '$1'); // 3h12m->3h, 4d6h->4d
  return d;
}

function buildParts({ els, style, palette, config, now, opts }) {
  const parts = [];
  const L = style.labels;
  const icons = style.icons || {};
  const lc = (s) => (style.lowercase ? s.toLowerCase() : s);
  const push = (key, text, group) => { if (text) parts.push({ key, text, group }); };
  const thresholds = config.colorThresholds;
  const barWidth = config.barWidth === 'auto' ? 8 : config.barWidth;

  // env group
  if (config.elements.model && els.model) {
    // Only append ·1M when the display name doesn't already advertise it
    // (real Claude Code sends names like "Opus 4.8 (1M context)").
    const already1m = /1m/i.test(els.model.name);
    const name = els.model.name + (els.model.context1m && !already1m ? '·1M' : '');
    push('model', (icons.model ? icons.model + ' ' : '') + name, 'env');
  }
  if (config.elements.project && els.project) {
    push('project', (icons.project ? icons.project + ' ' : '') + els.project, 'env');
  }
  if (config.elements.gitBranch && els.branch) {
    const lbl = L.branch ? L.branch + (icons.project ? ' ' : '') : '';
    push('branch', (lbl ? lbl + ' ' : '') + els.branch, 'env');
  }

  // context group
  if (config.elements.context && els.context) {
    const c = els.context;
    let suffix = '';
    if (opts.includeTokens) {
      suffix = style.rawTokens
        ? `${tokensK(c.tokensK * 1000, style.decimals)}/${c.sizeK}k`
        : tokensK(c.tokensK * 1000, style.decimals);
    }
    const text = opts.bars
      ? renderMetric({ label: lc(L.ctx), pct: c.pct, suffix, style, palette, thresholds, barWidth })
      : `${lc(L.ctx)} ${colorizePct(c.pct, thresholds, palette)}${suffix ? ' ' + suffix : ''}`;
    push('context', text, 'context');
  }
  if (config.elements.autoCompact && els.autoCompact && opts.includeAutoCompact) {
    push('autoCompact', `${lc(L.ac)} ${els.autoCompact.leftPct}%`, 'context');
  }

  // limits group
  const limit = (key, lbl, el) => {
    if (!el) return;
    const reset = fmtReset(el.resetsAt, now, opts.resetPrecision);
    if (el.pct >= 100) {
      const limitWord = colorize('LIMIT', 'high', palette);
      push(key, `${lc(lbl)} ${limitWord}${reset ? ' ' + reset : ''}`, 'limits');
      return;
    }
    const text = opts.bars
      ? renderMetric({ label: lc(lbl), pct: el.pct, suffix: reset, style, palette, thresholds, barWidth })
      : `${lc(lbl)} ${colorizePct(el.pct, thresholds, palette)}${reset ? ' ' + reset : ''}`;
    push(key, text, 'limits');
  };
  if (config.elements.session) limit('session', L.sess, els.session);
  if (config.elements.weekly) limit('weekly', L.wk, els.weekly);

  if (config.elements.cost && els.cost && els.cost.isApiKey) {
    const ctxK = els.context ? tokensK(els.context.tokensK * 1000, style.decimals) : '0k';
    push('cost', `${formatUsd(els.cost.usd)} ${lc('est')} · ${ctxK} ctx`, 'limits');
  }

  return parts;
}

// helper: colored "NN%" without a bar
function colorizePct(pct, thresholds, palette) {
  return colorize(`${pct}%`, tier(pct, thresholds), palette);
}

const PL_LEFT = '';   // Nerd Font left half-circle
const PL_RIGHT = '';  // Nerd Font right half-circle
const UNI_LEFT = '◖';  // u+25D6 standard-Unicode left half-circle (no Nerd Font needed)
const UNI_RIGHT = '◗'; // u+25D7

function segKeyFor(part, assign) {
  return assign['_' + part.group];
}

function decorate(parts, style, palette, caps) {
  const dec = style.decoration || { type: 'none' };
  const RESET = palette.reset;
  const hasDeco = palette.deco && Object.keys(palette.deco).length > 0;

  if (dec.type === 'none') {
    return { parts: parts.map(p => ({ ...p, text: p.text + RESET })) };
  }

  if (dec.type === 'pill') {
    const assign = dec.assign || {};
    const out = parts.map(p => {
      if (p.plain) return { ...p, text: p.text + RESET };
      const roleKey = assign[p.key];
      const pair = hasDeco && roleKey ? palette.deco[roleKey] : null;
      const text = pair ? `${pair.bg}${pair.fg} ${p.text} ${RESET}` : p.text + RESET;
      return { ...p, text };
    });
    return { parts: out };
  }

  // segment
  const assign = dec.assign || {};
  const nerd = !!(caps && caps.nerd);
  const uni = !!(caps && caps.unicode);
  const useCaps = nerd || uni;
  const capL = nerd ? PL_LEFT : UNI_LEFT;
  const capR = nerd ? PL_RIGHT : UNI_RIGHT;
  const out = parts.map(p => {
    if (p.plain) return { ...p, text: p.text + RESET };
    const roleKey = dec.byGroup ? segKeyFor(p, assign) : assign[p.key];
    const pair = hasDeco && roleKey ? palette.deco[roleKey] : null;
    if (!pair) return { ...p, text: p.text + RESET };
    if (useCaps) {
      const segFg = pair.bg.replace('[48;', '[38;');
      const text = `${segFg}${capL}${pair.bg}${pair.fg} ${p.text} \x1b[49m${segFg}${capR}${RESET}`;
      return { ...p, text };
    }
    return { ...p, text: `${pair.bg}${pair.fg} ${p.text} ${RESET}` };
  });
  return { parts: out, sep: useCaps ? '' : ' ' };
}

module.exports = { renderMetric, buildParts, decorate };
