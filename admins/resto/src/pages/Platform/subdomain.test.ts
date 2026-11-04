import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_LOGIN_MAX,
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_MAX,
  SUBDOMAIN_MIN,
  cleanSubdomainInput,
  platformDomainOf,
  suggestOwnerLogin,
  suggestSubdomain,
  tenantHost,
  validateOwnerLogin,
  validateSubdomain,
} from './subdomain.ts';

test('cleanSubdomainInput: kichik harf, bo\'shliq va pastki chiziq -> chiziqcha, begona belgilar tashlanadi', () => {
  assert.equal(cleanSubdomainInput('Guliston Restoran'), 'guliston-restoran');
  assert.equal(cleanSubdomainInput('my_cafe'), 'my-cafe');
  assert.equal(cleanSubdomainInput("O'tkir!@#"), 'otkir');
  assert.equal(cleanSubdomainInput('a  --  b'), 'a-b', 'ketma-ket chiziqchalar bittaga');
  assert.equal(cleanSubdomainInput('Гулистон'), '', 'lotin bo\'lmagan harflar tashlanadi (taklif alohida)');
  assert.equal(cleanSubdomainInput(''), '');
  assert.equal(cleanSubdomainInput('a'.repeat(60)).length, SUBDOMAIN_MAX);
});

test('validateSubdomain: format (3..40, harf-raqam-chiziqcha, chetda chiziqcha yo\'q)', () => {
  assert.equal(validateSubdomain(''), 'empty');
  assert.equal(validateSubdomain('ab'), 'too_short');
  assert.equal(validateSubdomain('abc'), null, 'aynan 3 — o\'tadi');
  assert.equal(validateSubdomain('a'.repeat(SUBDOMAIN_MAX)), null, 'aynan 40 — o\'tadi');
  assert.equal(validateSubdomain('a'.repeat(SUBDOMAIN_MAX + 1)), 'too_long');
  assert.equal(validateSubdomain('-abc'), 'edge_hyphen');
  assert.equal(validateSubdomain('abc-'), 'edge_hyphen');
  assert.equal(validateSubdomain('a-b'), null);
  assert.equal(validateSubdomain('123'), null);
  assert.equal(SUBDOMAIN_MIN, 3);
});

test('validateSubdomain: band so\'zlar rad etiladi', () => {
  for (const word of ['www', 'app', 'admin', 'api', 'static', 'media', 'platform', 'mail']) {
    assert.ok(RESERVED_SUBDOMAINS.has(word), word);
    assert.equal(validateSubdomain(word), 'reserved', word);
  }
  assert.equal(validateSubdomain('apps'), null, 'o\'xshash, lekin band emas');
  assert.equal(validateSubdomain('my-app'), null);
});

test('suggestSubdomain: nomdan taklif (lotin, o\' va g\' belgisiz, kirill, diakritik)', () => {
  assert.equal(suggestSubdomain('Guliston Restoran'), 'guliston-restoran');
  assert.equal(suggestSubdomain("O'tkir Osh Markazi"), 'otkir-osh-markazi');
  assert.equal(suggestSubdomain('Bog‘ishamol'), 'bogishamol', 'o‘ belgisi (U+2018)');
  assert.equal(suggestSubdomain('G`azal Kafe'), 'gazal-kafe');
  assert.equal(suggestSubdomain('Тандир'), 'tandir');
  assert.equal(suggestSubdomain('Ўзбекистон Ошхонаси'), 'ozbekiston-oshxonasi');
  assert.equal(suggestSubdomain('Café Münch'), 'cafe-munch');
  assert.equal(suggestSubdomain('  Salom!!!  Dunyo  '), 'salom-dunyo');
  assert.equal(suggestSubdomain('Cafe #1'), 'cafe-1');
});

test('suggestSubdomain: juda qisqa, bo\'sh yoki harfsiz nom -> bo\'sh; uzun nom 40 ga kesiladi va chetda chiziqcha qolmaydi', () => {
  assert.equal(suggestSubdomain(''), '');
  assert.equal(suggestSubdomain('  '), '');
  assert.equal(suggestSubdomain('Ab'), '');
  assert.equal(suggestSubdomain('★★★'), '');
  assert.equal(suggestSubdomain(undefined as unknown as string), '');
  const long = suggestSubdomain('Juda uzun nomli restoran '.repeat(5));
  assert.ok(long.length <= SUBDOMAIN_MAX && long.length >= 3, long);
  assert.ok(!long.endsWith('-') && !long.startsWith('-'));
  // kesilgan joyda chiziqcha qolsa tozalanadi
  assert.equal(suggestSubdomain(`${'a'.repeat(39)} bbb`), 'a'.repeat(39));
  assert.equal(validateSubdomain(suggestSubdomain('Guliston Restoran')), null, 'taklif doim yaroqli');
});

test('suggestSubdomain: band so\'z taklif qilinsa ham validate rad etadi', () => {
  assert.equal(suggestSubdomain('Admin'), 'admin');
  assert.equal(validateSubdomain(suggestSubdomain('Admin')), 'reserved');
});

test('suggestOwnerLogin: nomdan taklif (pastki chiziq), 3..30', () => {
  assert.equal(suggestOwnerLogin('Guliston Restoran'), 'guliston_restoran');
  assert.equal(suggestOwnerLogin("O'tkir Osh"), 'otkir_osh');
  assert.equal(suggestOwnerLogin('Ab'), '');
  assert.equal(suggestOwnerLogin(''), '');
  const long = suggestOwnerLogin('Juda uzun nomli restoran uchun login '.repeat(3));
  assert.ok(long.length <= OWNER_LOGIN_MAX && !long.endsWith('_'), long);
  assert.equal(validateOwnerLogin(suggestOwnerLogin('Guliston Restoran')), null);
});

test('validateOwnerLogin', () => {
  assert.equal(validateOwnerLogin(''), 'empty');
  assert.equal(validateOwnerLogin('ab'), 'too_short');
  assert.equal(validateOwnerLogin('abc'), null);
  assert.equal(validateOwnerLogin('a'.repeat(OWNER_LOGIN_MAX)), null);
  assert.equal(validateOwnerLogin('a'.repeat(OWNER_LOGIN_MAX + 1)), 'too_long');
  assert.equal(validateOwnerLogin('a b c'), 'bad_chars');
  assert.equal(validateOwnerLogin('логин'), 'bad_chars');
  assert.equal(validateOwnerLogin('ali.valiyev-01_x'), null);
});

test('platformDomainOf: port va bosh www./app. olib tashlanadi', () => {
  assert.equal(platformDomainOf('menu.uz'), 'menu.uz');
  assert.equal(platformDomainOf('app.menu.uz'), 'menu.uz');
  assert.equal(platformDomainOf('WWW.Menu.uz:8000'), 'menu.uz');
  assert.equal(platformDomainOf('127.0.0.1:8000'), '127.0.0.1');
  assert.equal(platformDomainOf(''), '');
  assert.equal(platformDomainOf('app.app.menu.uz'), 'app.menu.uz', 'faqat bitta bosh yorliq');
});

test('tenantHost', () => {
  assert.equal(tenantHost('guliston', 'menu.uz'), 'guliston.menu.uz');
  assert.equal(tenantHost('', 'menu.uz'), 'mijoz.menu.uz');
});
