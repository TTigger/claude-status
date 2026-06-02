const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { deepMerge, loadConfig } = require('../src/config');
const { DEFAULT_CONFIG } = require('../src/defaults');

test('deepMerge overlays only provided keys', () => {
  const merged = deepMerge(DEFAULT_CONFIG, { style: 'tech', elements: { weekly: false } });
  assert.strictEqual(merged.style, 'tech');
  assert.strictEqual(merged.elements.weekly, false);
  assert.strictEqual(merged.elements.session, true); // untouched
  assert.strictEqual(merged.layout, 'auto');         // untouched
});

test('loadConfig returns defaults when file missing', () => {
  const p = path.join(os.tmpdir(), 'no-such-cfg-' + process.pid + '.json');
  assert.deepStrictEqual(loadConfig(p), DEFAULT_CONFIG);
});

test('loadConfig deep-merges file over defaults', () => {
  const p = path.join(os.tmpdir(), 'cfg-' + process.pid + '.json');
  fs.writeFileSync(p, JSON.stringify({ style: 'minimal' }));
  assert.strictEqual(loadConfig(p).style, 'minimal');
  assert.strictEqual(loadConfig(p).layout, 'auto');
  fs.unlinkSync(p);
});

const { coerceValue } = require('../src/config');

test('coerceValue validates choice keys', () => {
  assert.deepStrictEqual(coerceValue('style', 'tech'), { ok: true, value: 'tech' });
  const bad = coerceValue('style', 'nope');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.includes('claude')); // lists valid choices
});

test('coerceValue parses bool and int with range', () => {
  assert.deepStrictEqual(coerceValue('elements.weekly', 'false'), { ok: true, value: false });
  assert.deepStrictEqual(coerceValue('refreshIntervalSec', '10'), { ok: true, value: 10 });
  assert.strictEqual(coerceValue('refreshIntervalSec', '0').ok, false); // below min 1
});

test('coerceValue barWidth accepts auto or int', () => {
  assert.deepStrictEqual(coerceValue('barWidth', 'auto'), { ok: true, value: 'auto' });
  assert.deepStrictEqual(coerceValue('barWidth', '12'), { ok: true, value: 12 });
});
