import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TENANTS_URL, checkSubdomainUrl, resetOwnerPasswordUrl, tenantUrl } from './urls.ts';

test('platforma manzillari shartnoma bo\'yicha', () => {
  assert.equal(TENANTS_URL, '/api/platform/v1/tenants/');
  assert.equal(tenantUrl(7), '/api/platform/v1/tenants/7/');
  assert.equal(tenantUrl('abc'), '/api/platform/v1/tenants/abc/');
  assert.equal(resetOwnerPasswordUrl(7), '/api/platform/v1/tenants/7/reset-owner-password/');
});

test('check-subdomain: so\'rov matni kodlanadi (zararli belgilar yo\'lni buzmaydi)', () => {
  assert.equal(checkSubdomainUrl('guliston'), '/api/platform/v1/tenants/check-subdomain/?q=guliston');
  assert.equal(checkSubdomainUrl('a&b=c d'), '/api/platform/v1/tenants/check-subdomain/?q=a%26b%3Dc%20d');
  assert.equal(checkSubdomainUrl(''), '/api/platform/v1/tenants/check-subdomain/?q=');
});

test('tenantUrl: id kodlanadi (yo\'l ajratgichi kirib keta olmaydi)', () => {
  assert.equal(tenantUrl('1/../2'), '/api/platform/v1/tenants/1%2F..%2F2/');
});
