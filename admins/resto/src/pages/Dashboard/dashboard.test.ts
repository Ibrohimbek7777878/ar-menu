import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardRoute } from './route.ts';

test('dashboardRoute has correct defaults', () => {
  assert.equal(dashboardRoute.path, '');
  assert.equal(dashboardRoute.title, 'Boshqaruv Markazi');
  assert.equal(dashboardRoute.capability, 'kds');
});
