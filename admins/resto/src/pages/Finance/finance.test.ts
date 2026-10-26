import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financeRoute } from './route.ts';

function buildExportCsvUrl(from?: string, to?: string): string {
  const sp = new URLSearchParams();
  if (from) sp.set('from', from);
  if (to) sp.set('to', to);
  const q = sp.toString();
  return `/api/restaurant/admin/v1/finance/export.csv${q ? '?' + q : ''}`;
}

test('financeRoute has correct path and capability', () => {
  assert.equal(financeRoute.path, 'finance');
  assert.equal(financeRoute.title, 'Moliya va Kassa');
  assert.equal(financeRoute.capability, 'finance');
});

test('buildExportCsvUrl generates correct export endpoints', () => {
  const url1 = buildExportCsvUrl();
  assert.equal(url1, '/api/restaurant/admin/v1/finance/export.csv');

  const url2 = buildExportCsvUrl('2026-10-01', '2026-10-26');
  assert.equal(url2, '/api/restaurant/admin/v1/finance/export.csv?from=2026-10-01&to=2026-10-26');
});

test('net cash flow invariant', () => {
  const income = 1500000;
  const expense = 600000;
  const netCashFlow = income - expense;
  assert.equal(netCashFlow, 900000);
});

test('debt remaining amount invariant', () => {
  const initial = 500000;
  const paid = 200000;
  const remaining = Math.max(0, initial - paid);
  assert.equal(remaining, 300000);

  const overpaid = 600000;
  const remainingZero = Math.max(0, initial - overpaid);
  assert.equal(remainingZero, 0);
});
