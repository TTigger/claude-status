const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runPing } = require('../src/ping/run');
const state = require('../src/ping/state');

function tmp() {
  return path.join(os.tmpdir(), 'cs-pingrun-' + process.pid + '-' + Math.floor(performance.now()) + '.json');
}
const config = { ping: { enabled: true, minSeconds: 30, onWaiting: true, waitingCooldownSec: 60, sound: false } };

test('start records startTs and does not notify', () => {
  const sp = tmp();
  let spawned = false;
  const spawn = () => { spawned = true; return { unref() {} }; };
  const r = runPing({ arg: 'start', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1000, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(r.notified, false);
  assert.strictEqual(state.getSession(sp, 'A').startTs, 1000);
  assert.strictEqual(spawned, false);
  fs.unlinkSync(sp);
});

test('stop >= minSeconds notifies via gui spawn and names project', () => {
  const sp = tmp();
  state.recordStart(sp, 'A', 1000);
  let spawned = null;
  const spawn = (cmd, args) => { spawned = { cmd, args }; return { unref() {} }; };
  const r = runPing({ arg: 'stop', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1040, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(r.notified, true);
  assert.strictEqual(r.channel, 'gui');
  assert.strictEqual(spawned.cmd, 'osascript');
  assert.ok(spawned.args.join(' ').includes('proj'));
  fs.unlinkSync(sp);
});

test('stop below minSeconds does not notify', () => {
  const sp = tmp();
  state.recordStart(sp, 'A', 1000);
  let spawned = false;
  const spawn = () => { spawned = true; return { unref() {} }; };
  const r = runPing({ arg: 'stop', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1010, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(r.notified, false);
  assert.strictEqual(spawned, false);
  fs.unlinkSync(sp);
});

test('stop_hook_active is a no-op', () => {
  const sp = tmp();
  state.recordStart(sp, 'A', 1000);
  let spawned = false;
  const spawn = () => { spawned = true; return { unref() {} }; };
  const r = runPing({ arg: 'stop', stdin: { session_id: 'A', cwd: '/x/proj', stop_hook_active: true }, config, now: 2000, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(r.notified, false);
  assert.strictEqual(spawned, false);
  fs.unlinkSync(sp);
});

test('headless linux rings the bell, no spawn', () => {
  const sp = tmp();
  state.recordStart(sp, 'A', 1000);
  let spawned = false;
  const spawn = () => { spawned = true; return { unref() {} }; };
  let out = '';
  const stderr = { write: (s) => { out += s; } };
  const r = runPing({ arg: 'stop', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1100, statePath: sp, spawn, platform: 'linux', env: {}, stderr });
  assert.strictEqual(r.channel, 'bell');
  assert.strictEqual(spawned, false);
  assert.ok(out.includes('\x07'));
  fs.unlinkSync(sp);
});

test('waiting notifies then debounces within cooldown then fires again', () => {
  const sp = tmp();
  let calls = 0;
  const spawn = () => { calls++; return { unref() {} }; };
  const a = runPing({ arg: 'waiting', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1000, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  const b = runPing({ arg: 'waiting', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1030, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  const c = runPing({ arg: 'waiting', stdin: { session_id: 'A', cwd: '/x/proj' }, config, now: 1100, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(a.notified, true);
  assert.strictEqual(b.notified, false);
  assert.strictEqual(c.notified, true);
  assert.strictEqual(calls, 2);
  fs.unlinkSync(sp);
});

test('disabled config is an instant no-op', () => {
  const sp = tmp();
  state.recordStart(sp, 'A', 1000);
  let spawned = false;
  const spawn = () => { spawned = true; return { unref() {} }; };
  const off = { ping: { ...config.ping, enabled: false } };
  const r = runPing({ arg: 'stop', stdin: { session_id: 'A', cwd: '/x/proj' }, config: off, now: 9999, statePath: sp, spawn, platform: 'darwin', env: {}, stderr: null });
  assert.strictEqual(r.notified, false);
  assert.strictEqual(spawned, false);
  fs.unlinkSync(sp);
});
