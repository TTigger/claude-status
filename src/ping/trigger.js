function decide({ event, startTs, now, lastWaitingTs, config }) {
  if (!config || config.enabled === false) return { notify: false, kind: null, reason: 'disabled' };
  if (event === 'start') return { notify: false, kind: null, reason: 'start' };

  if (event === 'stop') {
    if (startTs == null) return { notify: false, kind: null, reason: 'no-start' };
    if (now - startTs < config.minSeconds) return { notify: false, kind: null, reason: 'too-short' };
    return { notify: true, kind: 'stop', reason: 'done' };
  }

  if (event === 'waiting') {
    if (config.onWaiting === false) return { notify: false, kind: null, reason: 'waiting-off' };
    if (lastWaitingTs != null && (now - lastWaitingTs) < config.waitingCooldownSec) {
      return { notify: false, kind: null, reason: 'cooldown' };
    }
    return { notify: true, kind: 'waiting', reason: 'blocked' };
  }

  return { notify: false, kind: null, reason: 'unknown-event' };
}

module.exports = { decide };
