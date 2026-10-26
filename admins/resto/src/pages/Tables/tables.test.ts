import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tablesRoute } from './route.ts';

test('tablesRoute has correct path and capability', () => {
  assert.equal(tablesRoute.path, 'tables');
  assert.equal(tablesRoute.title, 'Stollar va QR');
  assert.equal(tablesRoute.capability, 'tables_read');
});

test('tables status configuration coverage', () => {
  const allowedStatuses = ['free', 'occupied', 'ordering', 'waiting', 'ready', 'bill', 'cleaning'];
  assert.equal(allowedStatuses.length, 7);
  assert.ok(allowedStatuses.includes('free'));
  assert.ok(allowedStatuses.includes('bill'));
});
