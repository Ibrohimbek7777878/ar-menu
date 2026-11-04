import { test } from 'node:test';
import assert from 'node:assert/strict';
import { failureKind, indexFromField } from './errorKind.ts';

test('failureKind: HTTP holat -> tur', () => {
  assert.equal(failureKind(0), 'network');
  assert.equal(failureKind(Number.NaN), 'network');
  assert.equal(failureKind(403), 'forbidden');
  assert.equal(failureKind(404), 'not_found');
  assert.equal(failureKind(409), 'conflict');
  assert.equal(failureKind(413), 'too_big');
  assert.equal(failureKind(415), 'bad_type');
  assert.equal(failureKind(429), 'busy');
  assert.equal(failureKind(400), 'server');
  assert.equal(failureKind(500), 'server');
});

test('indexFromField: yo\'ldan qator raqami', () => {
  assert.equal(indexFromField('hotspots[2].t_end', 'hotspots'), 2);
  assert.equal(indexFromField('hotspots[0]', 'hotspots'), 0);
  assert.equal(indexFromField('stops[11].title', 'stops'), 11);
  assert.equal(indexFromField('stops[1].title', 'hotspots'), null);
  assert.equal(indexFromField('hotspots', 'hotspots'), null);
  assert.equal(indexFromField('', 'stops'), null);
  assert.equal(indexFromField(undefined as unknown as string, 'stops'), null);
});
