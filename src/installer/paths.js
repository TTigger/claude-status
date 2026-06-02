const path = require('node:path');
const os = require('node:os');

function home(h) { return h || os.homedir(); }
function claudeDir(h) { return path.join(home(h), '.claude'); }
function settingsPath(h) { return path.join(claudeDir(h), 'settings.json'); }
function configPath(h) { return path.join(claudeDir(h), 'claude-status.config.json'); }
function backupPath(h) { return path.join(claudeDir(h), 'settings.json.bak'); }

module.exports = { claudeDir, settingsPath, configPath, backupPath };
