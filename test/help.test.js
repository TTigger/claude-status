'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { HELP, topicHelp } = require('../src/help');
const { STYLES, LAYOUTS } = require('../src/registry');

// ── HELP (top-level overview) ────────────────────────────────────────────────

test('HELP includes core commands', () => {
  assert.ok(HELP.includes('install'), 'HELP should include "install"');
  assert.ok(HELP.includes('style'), 'HELP should include "style"');
  assert.ok(HELP.includes('layout'), 'HELP should include "layout"');
  assert.ok(HELP.includes('alias'), 'HELP should include "alias"');
  assert.ok(HELP.includes('config'), 'HELP should include "config"');
  assert.ok(HELP.includes('preview'), 'HELP should include "preview"');
});

test('HELP includes every style name from STYLES', () => {
  for (const s of STYLES) {
    assert.ok(HELP.includes(s.name), `HELP should include style name "${s.name}"`);
  }
});

// ── topicHelp('styles') ──────────────────────────────────────────────────────

test('topicHelp("styles") includes every style name', () => {
  const out = topicHelp('styles');
  for (const s of STYLES) {
    assert.ok(out.includes(s.name), `styles topic should include "${s.name}"`);
  }
});

// ── topicHelp('layout') ──────────────────────────────────────────────────────

test('topicHelp("layout") includes every layout name', () => {
  const out = topicHelp('layout');
  for (const l of LAYOUTS) {
    assert.ok(out.includes(l.name), `layout topic should include "${l.name}"`);
  }
});

// ── topicHelp('cc') ──────────────────────────────────────────────────────────

test('topicHelp("cc") mentions alias and collision/compiler', () => {
  const out = topicHelp('cc');
  assert.ok(out.includes('alias'), 'cc topic should mention "alias"');
  assert.ok(/collision|compiler/i.test(out), 'cc topic should mention collision or compiler');
});

// ── topicHelp('colors') ──────────────────────────────────────────────────────

test('topicHelp("colors") mentions colorThresholds/threshold and theme', () => {
  const out = topicHelp('colors');
  assert.ok(
    out.includes('colorThresholds') || out.toLowerCase().includes('threshold'),
    'colors topic should mention colorThresholds or threshold'
  );
  assert.ok(out.includes('theme'), 'colors topic should mention "theme"');
});

// ── topicHelp('troubleshooting') ─────────────────────────────────────────────

test('topicHelp("troubleshooting") mentions session and ascii/Nerd', () => {
  const out = topicHelp('troubleshooting');
  assert.ok(/session/i.test(out), 'troubleshooting topic should mention session');
  assert.ok(
    /Nerd/i.test(out) || out.includes('ascii'),
    'troubleshooting topic should mention Nerd Font or ascii'
  );
});

// ── topicHelp(unknown) ───────────────────────────────────────────────────────

test('topicHelp("bogus") falls back to HELP', () => {
  assert.strictEqual(topicHelp('bogus'), HELP);
});

test('topicHelp("") falls back to HELP', () => {
  assert.strictEqual(topicHelp(''), HELP);
});

test('topicHelp(undefined) falls back to HELP', () => {
  assert.strictEqual(topicHelp(undefined), HELP);
});
