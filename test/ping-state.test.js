const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const state = require('../src/ping/state');

function tmp() {
  return path.join(os.tmpdir(), 'cs-pingstate-' + process.pid + '-' + Math.floor(performance.now()) + '.json');
}

test('recordStart then getSession returns startTs', () => {
  const p = tmp();
  state.recordStart(p, 'A', 1000);
  assert.strictEqual(state.getSession(p, 'A').startTs, 1000);
  fs.unlinkSync(p);
});

test('recordWaiting stores lastWaitingTs without clobbering startTs', () => {
  const p = tmp();
  state.recordStart(p, 'A', 1000);
  state.recordWaiting(p, 'A', 1200);
  const s = state.getSession(p, 'A');
  assert.strictEqual(s.startTs, 1000);
  assert.strictEqual(s.lastWaitingTs, 1200);
  fs.unlinkSync(p);
});

test('clearStart removes only startTs', () => {
  const p = tmp();
  state.recordStart(p, 'A', 1000);
  state.clearStart(p, 'A', 1000);
  assert.strictEqual(state.getSession(p, 'A').startTs, undefined);
  fs.unlinkSync(p);
});

test('writes prune sessions older than 24h', () => {
  const p = tmp();
  state.recordStart(p, 'OLD', 1000);
  // a new write far in the future prunes the stale OLD session
  state.recordStart(p, 'NEW', 1000 + 90000);
  assert.deepStrictEqual(state.getSession(p, 'OLD'), {});
  assert.strictEqual(state.getSession(p, 'NEW').startTs, 91000);
  fs.unlinkSync(p);
});

test('getSession on a missing file returns empty object', () => {
  assert.deepStrictEqual(state.getSession(tmp(), 'NOPE'), {});
});
