const test = require('node:test');
const assert = require('node:assert');
const { layoutLines, visibleWidth } = require('../src/layout');
const { stripAnsi } = require('../src/format');

function fakeBuild(opts) {
  const parts = [
    { key: 'model', text: 'Opus 4.8·1M', group: 'env' },
    { key: 'project', text: 'claude-status', group: 'env' },
    { key: 'branch', text: 'main', group: 'env' },
    { key: 'context', text: opts.bars ? 'Ctx ###### 23% 47k' : 'Ctx 23%', group: 'context' },
    { key: 'session', text: opts.bars ? 'S ###### 52% 3h12m' : 'S 52% 3h', group: 'limits' },
    { key: 'weekly', text: opts.bars ? 'W ###### 31% 4d6h' : 'W 31% 4d', group: 'limits' },
  ];
  if (!opts.includeAutoCompact) return parts;
  parts.splice(4, 0, { key: 'autoCompact', text: 'compact 60%', group: 'context' });
  return parts;
}

test('visibleWidth ignores ANSI', () => {
  assert.strictEqual(visibleWidth('\x1b[31mhi\x1b[0m'), 2);
});

test('auto on wide terminal keeps one line with bars', () => {
  const out = layoutLines(fakeBuild, 'auto', 200, ' | ');
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(out.includes('######'));
});

test('auto on narrow terminal shrinks to one line without bars', () => {
  const out = layoutLines(fakeBuild, 'auto', 60, ' | ');
  assert.strictEqual(out.split('\n').length, 1);
  assert.ok(!stripAnsi(out).includes('######'));
});

test('three layout always 3 lines', () => {
  const out = layoutLines(fakeBuild, 'three', 200, ' | ');
  assert.strictEqual(out.split('\n').length, 3);
});
