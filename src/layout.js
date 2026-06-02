function visibleWidth(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

const FULL_OPTS = { includeTokens: true, includeAutoCompact: true, resetPrecision: 'full', bars: true };

const SHRINK = [
  (o) => ({ ...o, includeTokens: false }),
  (o) => ({ ...o, includeAutoCompact: false }),
  (o) => ({ ...o, resetPrecision: 'short' }),
  (o) => ({ ...o, bars: false }),
  (o) => ({ ...o, dropBranch: true }),
];

function joinParts(parts, sep, dropBranch) {
  return parts.filter(p => !(dropBranch && p.key === 'branch'))
              .map(p => p.text).join(sep);
}

function byGroup(parts, group, sep) {
  return parts.filter(p => p.group === group).map(p => p.text).join(sep);
}

function layoutLines(build, layout, columns, sep) {
  if (layout === 'three') {
    const p = build(FULL_OPTS);
    return [byGroup(p, 'env', sep), byGroup(p, 'context', sep), byGroup(p, 'limits', sep)]
      .filter(Boolean).join('\n');
  }
  if (layout === 'two') {
    const p = build(FULL_OPTS);
    const line1 = [byGroup(p, 'env', sep), byGroup(p, 'context', sep)].filter(Boolean).join(sep);
    const line2 = byGroup(p, 'limits', sep);
    return [line1, line2].filter(Boolean).join('\n');
  }
  if (layout === 'oneline') {
    const p = build({ ...FULL_OPTS, includeTokens: false, includeAutoCompact: false });
    return joinParts(p, sep, false);
  }
  let opts = { ...FULL_OPTS };
  let line = joinParts(build(opts), sep, false);
  for (const step of SHRINK) {
    if (visibleWidth(line) <= columns) break;
    opts = step(opts);
    line = joinParts(build(opts), sep, opts.dropBranch);
  }
  if (visibleWidth(line) <= columns) return line;
  const two = layoutLines(build, 'two', columns, sep);
  if (two.split('\n').every(l => visibleWidth(l) <= columns)) return two;
  return layoutLines(build, 'three', columns, sep);
}

module.exports = { layoutLines, visibleWidth };
