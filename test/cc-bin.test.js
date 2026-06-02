const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('cc bin errors clearly when claude missing', () => {
  const bin = path.join(__dirname, '..', 'bin', 'cc.js');
  try {
    // Use process.execPath (absolute node path) so emptying PATH below doesn't
    // stop the runner from launching node itself on Windows; PATH:'' + the fake
    // CLAUDE_STATUS_CLAUDE_BIN still guarantees the child cannot resolve claude.
    execFileSync(process.execPath, [bin, '--version'], {
      env: { ...process.env, PATH: '', CLAUDE_STATUS_CLAUDE_BIN: 'definitely-not-a-real-binary-xyz' },
    });
    assert.fail('should have thrown');
  } catch (e) {
    const msg = (e.stderr ? e.stderr.toString() : '') + (e.stdout ? e.stdout.toString() : '');
    assert.ok(/claude/i.test(msg));
  }
});
