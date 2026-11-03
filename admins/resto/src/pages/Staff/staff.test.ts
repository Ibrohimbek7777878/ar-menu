import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffRoute } from './route.ts';

test('staffRoute has correct path and capability', () => {
  assert.equal(staffRoute.path, 'staff');
  assert.equal(staffRoute.title, 'Xodimlar');
  assert.equal(staffRoute.capability, 'staff_admin');
});

test('creatable roles coverage', () => {
  const creatable = ['waiter', 'kitchen', 'hostess', 'shop_manager'];
  assert.equal(creatable.length, 4);
  assert.ok(creatable.includes('waiter'));
  assert.ok(creatable.includes('kitchen'));
});
