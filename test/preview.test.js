const test = require('node:test');
const assert = require('node:assert');
const { renderSample, galleryLine } = require('../src/preview');
const { stripAnsi } = require('../src/format');

test('renderSample renders chosen style/layout with fixture data', () => {
  const out = stripAnsi(renderSample({ style: 'ascii', layout: 'oneline', columns: 200 }));
  assert.ok(out.includes('Opus 4.8'));
  assert.ok(out.includes('[####') || out.includes('[##')); // ascii bar present somewhere
});

test('galleryLine returns single-line preview for a style', () => {
  const line = galleryLine('minimal', 200);
  assert.strictEqual(line.split('\n').length, 1);
  assert.ok(stripAnsi(line).includes('23%') || stripAnsi(line).includes('24%'));
});
