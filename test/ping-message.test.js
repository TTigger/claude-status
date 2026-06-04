const test = require('node:test');
const assert = require('node:assert');
const { buildMessage, projectName, formatDuration } = require('../src/ping/message');

test('projectName takes the last path segment, OS-independent', () => {
  assert.strictEqual(projectName('/home/me/claude-status'), 'claude-status');
  assert.strictEqual(projectName('C:\\\\Users\\\\me\\\\horaz-tour-link'), 'horaz-tour-link');
  assert.strictEqual(projectName('/home/me/proj/'), 'proj');
  assert.strictEqual(projectName(''), 'session');
});

test('formatDuration shows seconds under a minute, else humanized', () => {
  assert.strictEqual(formatDuration(45000), '45s');
  assert.strictEqual(formatDuration(125000), '2m');
});

test('stop message names the project and duration', () => {
  const m = buildMessage({ cwd: '/x/myproj', durationMs: 90000, kind: 'stop' });
  assert.strictEqual(m.title, 'Claude Code');
  assert.ok(m.message.includes('myproj'));
  assert.ok(m.message.includes('1m'));
  assert.ok(m.message.startsWith('✅'));
});

test('waiting message names the project and asks for you', () => {
  const m = buildMessage({ cwd: '/x/myproj', kind: 'waiting' });
  assert.ok(m.message.includes('myproj'));
  assert.ok(m.message.startsWith('⏳'));
});
