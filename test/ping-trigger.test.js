const test = require('node:test');
const assert = require('node:assert');
const { decide } = require('../src/ping/trigger');

const cfg = { enabled: true, minSeconds: 30, onWaiting: true, waitingCooldownSec: 60, sound: false };

test('disabled config never notifies', () => {
  const d = decide({ event: 'stop', startTs: 0, now: 9999, lastWaitingTs: null, config: { ...cfg, enabled: false } });
  assert.strictEqual(d.notify, false);
  assert.strictEqual(d.reason, 'disabled');
});

test('start event never notifies', () => {
  assert.strictEqual(decide({ event: 'start', now: 100, config: cfg }).notify, false);
});

test('stop with missing startTs does not notify', () => {
  const d = decide({ event: 'stop', startTs: undefined, now: 100, config: cfg });
  assert.strictEqual(d.notify, false);
  assert.strictEqual(d.reason, 'no-start');
});

test('stop below minSeconds does not notify', () => {
  assert.strictEqual(decide({ event: 'stop', startTs: 100, now: 120, config: cfg }).notify, false);
});

test('stop at/above minSeconds notifies with kind stop', () => {
  const d = decide({ event: 'stop', startTs: 100, now: 130, config: cfg });
  assert.strictEqual(d.notify, true);
  assert.strictEqual(d.kind, 'stop');
});

test('waiting notifies when no prior waiting timestamp', () => {
  const d = decide({ event: 'waiting', now: 100, lastWaitingTs: null, config: cfg });
  assert.strictEqual(d.notify, true);
  assert.strictEqual(d.kind, 'waiting');
});

test('waiting within cooldown is suppressed', () => {
  assert.strictEqual(decide({ event: 'waiting', now: 130, lastWaitingTs: 100, config: cfg }).notify, false);
});

test('waiting after cooldown notifies again', () => {
  assert.strictEqual(decide({ event: 'waiting', now: 170, lastWaitingTs: 100, config: cfg }).notify, true);
});

test('waiting suppressed when onWaiting is false', () => {
  assert.strictEqual(decide({ event: 'waiting', now: 100, lastWaitingTs: null, config: { ...cfg, onWaiting: false } }).notify, false);
});
