import { test } from 'node:test';
import assert from 'node:assert/strict';
import { menuRoute } from './route.ts';

test('menuRoute has correct path and capability', () => {
  assert.equal(menuRoute.path, 'menu');
  assert.equal(menuRoute.title, 'Menyu');
  assert.equal(menuRoute.capability, 'menu_admin');
});
