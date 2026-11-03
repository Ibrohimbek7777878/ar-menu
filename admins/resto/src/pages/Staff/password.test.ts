import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, generatePassword, generateValidPassword, secureRandomInt } from './password.ts';

const AMBIGUOUS = /[0O1lIi]/;

test('generatePassword: standart uzunlik 12, har sinfdan kamida bittadan, adashtiriladigan belgi yo\'q', () => {
  for (let i = 0; i < 300; i += 1) {
    const password = generatePassword();
    assert.equal(password.length, 12);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /\d/);
    assert.match(password, /^[A-Za-z0-9]+$/);
    assert.doesNotMatch(password, AMBIGUOUS);
  }
});

test('generatePassword: har safar boshqacha (tasodifiy manba haqiqatan ishlaydi)', () => {
  const seen = new Set(Array.from({ length: 200 }, () => generatePassword()));
  assert.equal(seen.size, 200);
});

test('generatePassword: uzunlik chegaralari [8..64]; butun bo\'lmagan quyiga yaxlitlanadi; son bo\'lmasa 12', () => {
  assert.equal(generatePassword(secureRandomInt, 3).length, 8);
  assert.equal(generatePassword(secureRandomInt, 8).length, 8);
  assert.equal(generatePassword(secureRandomInt, 10.9).length, 10);
  assert.equal(generatePassword(secureRandomInt, 64).length, 64);
  assert.equal(generatePassword(secureRandomInt, 500).length, 64);
  assert.equal(generatePassword(secureRandomInt, Number.NaN).length, 12);
  assert.equal(generatePassword(secureRandomInt, Number.POSITIVE_INFINITY).length, 12);
  assert.equal(generatePassword(secureRandomInt, -5).length, 8);
});

test('generatePassword: qotib qolgan tasodifiy manba bilan ham uch sinf bor (majburiy belgilar yo\'qolmaydi)', () => {
  for (const rng of [() => 0, (max: number) => max - 1]) {
    const password = generatePassword(rng, 12);
    assert.equal(password.length, 12);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /\d/);
  }
});

test('generatePassword: noto\'g\'ri tasodifiy manba (diapazondan tashqari / kasr) xato tashlaydi', () => {
  assert.throws(() => generatePassword(() => 9999), RangeError);
  assert.throws(() => generatePassword(() => -1), RangeError);
  assert.throws(() => generatePassword(() => 0.5), RangeError);
  assert.throws(() => generatePassword(() => Number.NaN), RangeError);
});

test('secureRandomInt: diapazon ichida, barcha qiymatlar uchraydi; max noto\'g\'ri bo\'lsa xato', () => {
  const seen = new Set<number>();
  for (let i = 0; i < 400; i += 1) {
    const value = secureRandomInt(5);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 5);
    seen.add(value);
  }
  assert.equal(seen.size, 5);
  assert.equal(secureRandomInt(1), 0);
  assert.throws(() => secureRandomInt(0), RangeError);
  assert.throws(() => secureRandomInt(-3), RangeError);
  assert.throws(() => secureRandomInt(2.5), RangeError);
});

test('checkPassword: bo\'sh parol — "empty", o\'rnatib bo\'lmaydi', () => {
  assert.deepEqual(checkPassword(''), { level: 'empty', issues: [], ok: false });
});

test('checkPassword: qisqa (7 belgi) rad etiladi, 8 belgi o\'tadi', () => {
  assert.deepEqual(checkPassword('Ab3dEf7').issues, ['short']);
  assert.equal(checkPassword('Ab3dEf7').ok, false);
  assert.equal(checkPassword('Ab3dEf7h').ok, true);
});

test('checkPassword: faqat raqam, keng tarqalgan, loginga o\'xshash, bo\'sh joyli parollar rad etiladi', () => {
  assert.deepEqual(checkPassword('48291573').issues, ['numeric']);
  assert.deepEqual(checkPassword('12345678').issues, ['numeric', 'common']);
  assert.ok(checkPassword('Password').issues.includes('common'));
  assert.ok(checkPassword('QWERTYUIOP').issues.includes('common'));
  assert.deepEqual(checkPassword('ali_waiter2024', 'ali_waiter').issues, ['similar']);
  assert.deepEqual(checkPassword('Zx9ALI_WAITERx', 'ali_waiter').issues, ['similar']);
  assert.deepEqual(checkPassword(' Ab3dEf7hk').issues, ['spaces']);
  assert.deepEqual(checkPassword('Ab3dEf7hk ').issues, ['spaces']);
  assert.equal(checkPassword('Ab3d Ef7hk').ok, true);
});

test('checkPassword: juda qisqa login (2 belgi) o\'xshashlikka sabab bo\'lmaydi', () => {
  assert.equal(checkPassword('Kx8mQ2vdh', 'kx').ok, true);
});

test('checkPassword: 128 belgidan uzun rad etiladi (server chegarasi)', () => {
  assert.ok(checkPassword('aB3'.repeat(50)).issues.includes('long'));
  assert.equal(checkPassword('aB3'.repeat(42) + 'xy').ok, true);
});

test('checkPassword: daraja — o\'rtacha (8..11 yoki 2 sinf) va kuchli (12+ va 3 sinf)', () => {
  assert.equal(checkPassword('abcdefgh').level, 'fair');
  assert.equal(checkPassword('Ab3dEf7hKm').level, 'fair');
  assert.equal(checkPassword('Ab3dEf7hKmPq').level, 'strong');
  assert.equal(checkPassword('abcdefghijklmnop').level, 'fair');
  assert.equal(checkPassword('Ab3dEf7').level, 'weak');
});

test('generateValidPassword: login bo\'lagi tasodifan tushsa qayta yaratadi; doim yaroqli', () => {
  // Birinchi urinish login ("aaa") bilan to'qnashadigan parol beradi (manba doim 0 -> "a" lar), keyingilari tasodifiy emas, shuning uchun
  // faqat yaroqlilik va xato holati tekshiriladi.
  assert.throws(() => generateValidPassword('aaa', () => 0), /Mos parol/);
  for (let i = 0; i < 100; i += 1) {
    const password = generateValidPassword('ali_waiter');
    assert.equal(checkPassword(password, 'ali_waiter').ok, true);
  }
});

test('checkPassword: yaratilgan parol har doim "kuchli" va o\'rnatishga yaroqli', () => {
  for (let i = 0; i < 200; i += 1) {
    const check = checkPassword(generatePassword(), 'ali_waiter');
    assert.equal(check.ok, true);
    assert.equal(check.level, 'strong');
  }
});
