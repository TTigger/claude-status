const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const { settingsPath, configPath, backupPath } = require('../src/installer/paths');

test('paths resolve under a given home dir', () => {
  const home = path.join(os.tmpdir(), 'fakehome');
  assert.strictEqual(settingsPath(home), path.join(home, '.claude', 'settings.json'));
  assert.strictEqual(configPath(home), path.join(home, '.claude', 'claude-status.config.json'));
  assert.strictEqual(backupPath(home), path.join(home, '.claude', 'settings.json.bak'));
});
