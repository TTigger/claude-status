const fs = require('node:fs');

function readState(statePath) {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^﻿/, '')) || {}; }
  catch { return {}; }
}

function writeState(statePath, stateObj) {
  fs.writeFileSync(statePath, JSON.stringify(stateObj) + '\n');
}

function prune(sessions, now, maxAgeSec = 86400) {
  const out = {};
  for (const [id, rec] of Object.entries(sessions || {})) {
    const last = Math.max(rec.startTs || 0, rec.lastWaitingTs || 0);
    if (now - last < maxAgeSec) out[id] = rec;
  }
  return out;
}

function mutate(statePath, sessionId, now, patch) {
  const s = readState(statePath);
  s.sessions = prune(s.sessions, now);
  s.sessions[sessionId] = { ...(s.sessions[sessionId] || {}), ...patch };
  writeState(statePath, s);
}

function recordStart(statePath, sessionId, now) { mutate(statePath, sessionId, now, { startTs: now }); }
function recordWaiting(statePath, sessionId, now) { mutate(statePath, sessionId, now, { lastWaitingTs: now }); }

function clearStart(statePath, sessionId, now) {
  const s = readState(statePath);
  if (s.sessions && s.sessions[sessionId]) delete s.sessions[sessionId].startTs;
  s.sessions = prune(s.sessions, now);
  writeState(statePath, s);
}

function getSession(statePath, sessionId) {
  const s = readState(statePath);
  return (s.sessions && s.sessions[sessionId]) || {};
}

module.exports = { readState, writeState, prune, recordStart, recordWaiting, clearStart, getSession };
