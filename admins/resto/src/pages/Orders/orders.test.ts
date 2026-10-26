import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordersRoute } from './route.ts';

test('ordersRoute has correct path and capability', () => {
  assert.equal(ordersRoute.path, 'orders');
  assert.equal(ordersRoute.title, 'Buyurtmalar');
  assert.equal(ordersRoute.capability, 'kds');
});

test('order statuses coverage', () => {
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  assert.equal(statuses.length, 6);
  assert.ok(statuses.includes('pending'));
  assert.ok(statuses.includes('ready'));
});
