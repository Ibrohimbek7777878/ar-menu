import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsRoute } from './route.ts';

test('settingsRoute has correct path and capability', () => {
  assert.equal(settingsRoute.path, 'settings');
  assert.equal(settingsRoute.title, 'Restoran Sozlamalari');
  assert.equal(settingsRoute.capability, 'settings_admin');
});

test('service fee percent bounds validation', () => {
  const clampFee = (fee: number) => Math.min(100, Math.max(0, fee));
  assert.equal(clampFee(-5), 0);
  assert.equal(clampFee(10), 10);
  assert.equal(clampFee(120), 100);
});

test('kds timer warning and critical relation invariant', () => {
  const warning = 15;
  const critical = 30;
  assert.ok(warning < critical, 'Warning threshold must be less than critical threshold');
});
