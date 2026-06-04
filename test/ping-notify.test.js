const test = require('node:test');
const assert = require('node:assert');
const { notifyCommand, hasGui, sanitize } = require('../src/ping/notify');

test('sanitize strips quotes and newlines and caps length', () => {
  assert.strictEqual(sanitize('a"b\'c`d\ne'), 'abcd e');
  assert.strictEqual(sanitize('x'.repeat(500)).length, 200);
});

test('macOS uses osascript display notification', () => {
  const { cmd, args } = notifyCommand('darwin', { title: 'T', message: 'M', sound: false });
  assert.strictEqual(cmd, 'osascript');
  assert.ok(args.join(' ').includes('display notification "M" with title "T"'));
});

test('macOS adds sound name when sound is on', () => {
  const { args } = notifyCommand('darwin', { title: 'T', message: 'M', sound: true });
  assert.ok(args.join(' ').includes('sound name'));
});

test('linux uses notify-send with title and message args', () => {
  const { cmd, args } = notifyCommand('linux', { title: 'T', message: 'M' });
  assert.strictEqual(cmd, 'notify-send');
  assert.deepStrictEqual(args, ['T', 'M']);
});

test('windows builds a PowerShell three-tier script (BurntToast -> NotifyIcon -> BEL)', () => {
  const { cmd, args } = notifyCommand('win32', { title: 'T', message: 'M' });
  assert.strictEqual(cmd, 'powershell');
  const script = args.join(' ');
  assert.ok(script.includes('BurntToast'));
  assert.ok(script.includes('NotifyIcon'));
  assert.ok(script.includes('char]7') || script.includes('char]7)'));
});

test('hasGui: mac/win always true; linux needs a display', () => {
  assert.strictEqual(hasGui({}, 'darwin'), true);
  assert.strictEqual(hasGui({}, 'win32'), true);
  assert.strictEqual(hasGui({}, 'linux'), false);
  assert.strictEqual(hasGui({ DISPLAY: ':0' }, 'linux'), true);
  assert.strictEqual(hasGui({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux'), true);
});
