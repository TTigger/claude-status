const { clampPct } = require('./format');

function basename(p) {
  if (!p) return null;
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function sumUsage(u) {
  if (!u || typeof u !== 'object') return 0;
  let total = 0;
  for (const v of Object.values(u)) if (typeof v === 'number') total += v;
  return total;
}

function buildElements(stdin, opts) {
  const cw = stdin.context_window || {};
  const size = cw.context_window_size || 200000;
  const usedPct = typeof cw.used_percentage === 'number' ? cw.used_percentage : 0;
  let usedTokens = sumUsage(cw.current_usage);
  if (!usedTokens) usedTokens = (size * usedPct) / 100;

  const sizeKnown = Boolean(cw.context_window_size);
  const model = stdin.model
    ? { name: stdin.model.display_name || stdin.model.id || '?',
        context1m: sizeKnown ? size === 1000000 : /\[1m\]/.test(stdin.model.id || '') }
    : null;

  const rl = stdin.rate_limits || {};
  const mk = (r) => (r ? { pct: clampPct(r.used_percentage), resetsAt: r.resets_at } : null);

  const acLeft = Math.max(0, Math.round(opts.autoCompactThresholdPct - usedPct));

  const session = mk(rl.five_hour);
  const weekly = mk(rl.seven_day);
  const usd = (stdin.cost && typeof stdin.cost.total_cost_usd === 'number') ? stdin.cost.total_cost_usd : 0;
  const isApiKey = session === null && weekly === null;

  return {
    model,
    project: basename((stdin.workspace || {}).project_dir) ||
             basename((stdin.workspace || {}).current_dir),
    branch: null, // resolved by render caller via git
    context: { pct: clampPct(usedPct), tokensK: Math.round(usedTokens / 1000), sizeK: Math.round(size / 1000) },
    autoCompact: { leftPct: acLeft },
    session,
    weekly,
    cost: { usd, isApiKey },
  };
}

module.exports = { buildElements, basename };
