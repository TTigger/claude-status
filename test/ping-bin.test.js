const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('claude-status-ping start writes session state and exits 0', () => {
  const home = path.join(os.tmpdir(), 'cs-pingbin-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const input = JSON.stringify({ session_id: 'S1', cwd: '/tmp/myproj', hook_event_name: 'UserPromptSubmit' });
  execFileSync(process.execPath, [path.join(__dirname, '..', 'bin', 'claude-status-ping.js'), 'start'], { input, env });
  const statePath = path.join(home, '.claude', 'claude-status-ping.state.json');
  assert.ok(fs.existsSync(statePath));
  const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.ok(s.sessions.S1.startTs > 0);
});

test('claude-status-ping stop with bad stdin still exits 0', () => {
  const home = path.join(os.tmpdir(), 'cs-pingbin2-' + process.pid + '-' + Math.floor(performance.now()));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  // execFileSync throws on a non-zero exit; this asserts the bin exits 0 even on garbage stdin
  execFileSync(process.execPath, [path.join(__dirname, '..', 'bin', 'claude-status-ping.js'), 'stop'], { input: 'not json', env });
  assert.ok(true);
});
