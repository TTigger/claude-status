const test = require('node:test');
const assert = require('node:assert');
const { buildElements } = require('../src/elements');
const { SAMPLE } = require('../src/fixtures');

test('builds normalized model from sample', () => {
  const e = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  assert.deepStrictEqual(e.model, { name: 'Opus 4.8', context1m: true });
  assert.strictEqual(e.project, 'claude-status');
  assert.strictEqual(e.context.pct, 24);            // 23.5 rounded
  assert.strictEqual(e.context.tokensK, 47);        // 40000+7000
  assert.strictEqual(e.context.sizeK, 1000);
  assert.strictEqual(e.autoCompact.leftPct, 60);    // round(83.5-23.5)
  assert.strictEqual(e.session.pct, 52);
  assert.strictEqual(e.weekly.pct, 31);
});

test('missing rate_limits => session/weekly null', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  delete stdin.rate_limits;
  const e = buildElements(stdin, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.session, null);
  assert.strictEqual(e.weekly, null);
});

test('non-1m model has context1m false', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE));
  stdin.context_window.context_window_size = 200000;
  const e = buildElements(stdin, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.model.context1m, false);
  assert.strictEqual(e.context.sizeK, 200);
});

const { SAMPLE_APIKEY } = require('../src/fixtures');

test('cost: usd from stdin, isApiKey false when rate_limits present', () => {
  const e = buildElements(SAMPLE, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.cost.usd, 0.0123);
  assert.strictEqual(e.cost.isApiKey, false);
});

test('cost: isApiKey true when rate_limits absent', () => {
  const e = buildElements(SAMPLE_APIKEY, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.cost.isApiKey, true);
  assert.strictEqual(e.cost.usd, 0.0123);
});

test('cost: usd is 0 when stdin has no cost object', () => {
  const stdin = JSON.parse(JSON.stringify(SAMPLE_APIKEY));
  delete stdin.cost;
  const e = buildElements(stdin, { autoCompactThresholdPct: 83.5 });
  assert.strictEqual(e.cost.usd, 0);
});
