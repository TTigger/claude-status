const { humanizeDuration } = require('../format');

function projectName(cwd) {
  const parts = String(cwd || '').split(/[\\/]+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'session';
}

function formatDuration(durationMs) {
  const sec = Math.max(0, Math.round(durationMs / 1000));
  return sec < 60 ? `${sec}s` : humanizeDuration(sec);
}

function buildMessage({ cwd, durationMs, kind }) {
  const project = projectName(cwd);
  if (kind === 'waiting') {
    return { title: 'Claude Code', message: `⏳ ${project} needs you` };
  }
  return { title: 'Claude Code', message: `✅ ${project} finished (${formatDuration(durationMs)})` };
}

module.exports = { buildMessage, projectName, formatDuration };
