const test = require('node:test');
const assert = require('node:assert');
const { notifyCommand, hasGui, sanitize } = require('../src/ping/notify');

test('sanitize strips double-quotes, backticks, and newlines; caps length', () => {
  assert.strictEqual(sanitize('a"b\'c`d\ne'), "ab'cd e");
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

test('windows builds a PowerShell four-tier script (BurntToast -> WinRT toast -> NotifyIcon -> BEL)', () => {
  const { cmd, args } = notifyCommand('win32', { title: 'claude-status', message: 'done in 42s' });
  assert.strictEqual(cmd, 'powershell');
  const script = args[args.length - 1];
  assert.match(script, /ToastNotificationManager/);   // native WinRT tier present
  assert.match(script, /BurntToast/);                  // still preferred first
  assert.match(script, /ShowBalloonTip/);              // balloon kept as a later fallback
  assert.match(script, /\[char\]7/);                   // bell is the final fallback
});

test('hasGui: mac/win always true; linux needs a display', () => {
  assert.strictEqual(hasGui({}, 'darwin'), true);
  assert.strictEqual(hasGui({}, 'win32'), true);
  assert.strictEqual(hasGui({}, 'linux'), false);
  assert.strictEqual(hasGui({ DISPLAY: ':0' }, 'linux'), true);
  assert.strictEqual(hasGui({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux'), true);
});

test('sanitize keeps apostrophes but strips double-quotes and backticks', () => {
  // input: don't "q" `b`
  // chars: d,o,n,',t,SP,",q,",SP,`,b,`
  // after removing " and ` (but NOT '): d,o,n,',t,SP,q,SP,b = "don't q b"
  assert.strictEqual(sanitize("don't \"q\" `b`"), "don't q b");
});

test('win32 script uses registered PowerShell AUMID not claude-status', () => {
  const script = notifyCommand('win32', { title: 't', message: 'm' }).args.slice(-1)[0];
  assert.match(script, /CreateToastNotifier\('\{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7\}/);
});
