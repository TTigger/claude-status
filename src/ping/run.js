const { decide } = require('./trigger');
const { buildMessage } = require('./message');
const { notifyCommand, hasGui } = require('./notify');
const state = require('./state');

function runPing({ arg, stdin, config, now, statePath, spawn, platform, env, stderr }) {
  try {
    const ping = (config && config.ping) || {};
    const sessionId = (stdin && stdin.session_id) || 'default';
    const cwd = (stdin && stdin.cwd) || '';

    if (arg === 'stop' && stdin && stdin.stop_hook_active) {
      return { notified: false, reason: 'stop-active' };
    }

    if (arg === 'start') {
      state.recordStart(statePath, sessionId, now);
      return { notified: false, reason: 'recorded-start' };
    }

    const sess = state.getSession(statePath, sessionId);
    const d = decide({ event: arg, startTs: sess.startTs, now, lastWaitingTs: sess.lastWaitingTs, config: ping });

    if (arg === 'stop') state.clearStart(statePath, sessionId, now);
    if (arg === 'waiting' && d.notify) state.recordWaiting(statePath, sessionId, now);

    if (!d.notify) return { notified: false, reason: d.reason };

    const durationMs = arg === 'stop' && sess.startTs != null ? (now - sess.startTs) * 1000 : 0;
    const { title, message } = buildMessage({ cwd, durationMs, kind: d.kind });

    if (!hasGui(env, platform)) {
      if (stderr) stderr.write(`\x07claude-status ping: ${message}\n`);
      return { notified: true, channel: 'bell', reason: d.reason };
    }

    const { cmd, args } = notifyCommand(platform, { title, message, sound: !!ping.sound });
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    if (child && typeof child.unref === 'function') child.unref();
    return { notified: true, channel: 'gui', reason: d.reason };
  } catch {
    return { notified: false, reason: 'error' };
  }
}

module.exports = { runPing };
