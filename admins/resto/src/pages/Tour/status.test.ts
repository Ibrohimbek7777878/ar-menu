import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusTone, viewFor } from './status.ts';

test('statusTone: har holatga ton', () => {
  assert.equal(statusTone('draft'), 'neutral');
  assert.equal(statusTone('processing'), 'warn');
  assert.equal(statusTone('ready'), 'brand');
  assert.equal(statusTone('published'), 'success');
  assert.equal(statusTone('failed'), 'danger');
});

test('viewFor: holatga mos ko\'rinish', () => {
  assert.equal(viewFor('draft'), 'upload');
  assert.equal(viewFor('processing'), 'processing');
  assert.equal(viewFor('failed'), 'failed');
  assert.equal(viewFor('ready'), 'editor');
  assert.equal(viewFor('published'), 'editor');
});
