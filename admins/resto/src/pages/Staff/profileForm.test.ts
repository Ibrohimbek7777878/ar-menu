import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUsername, decideUsername, diffPersonal, nameParts, personalFromStaff, validatePersonal } from './profileForm.ts';
import { readProfileError } from './profileErrors.ts';

test('nameParts: first_name/last_name bor bo\'lsa shularni oladi (full_name e\'tiborga olinmaydi)', () => {
  assert.deepEqual(nameParts({ first_name: ' Ali ', last_name: 'Valiyev', full_name: 'boshqa ism', username: 'ali' }), { first: 'Ali', last: 'Valiyev' });
  assert.deepEqual(nameParts({ first_name: 'Ali', last_name: null }), { first: 'Ali', last: '' });
  assert.deepEqual(nameParts({ first_name: '', last_name: '', full_name: 'Ali Valiyev', username: 'ali' }), { first: '', last: '' });
});

test('nameParts: faqat full_name bo\'lsa (eski javob) bo\'laklaydi; ismsiz xodimda full_name = login -> bo\'sh', () => {
  assert.deepEqual(nameParts({ full_name: 'Ali Valiyev', username: 'ali_w' }), { first: 'Ali', last: 'Valiyev' });
  assert.deepEqual(nameParts({ full_name: 'Ali Karim Valiyev', username: 'ali_w' }), { first: 'Ali', last: 'Karim Valiyev' });
  assert.deepEqual(nameParts({ full_name: 'Ali', username: 'ali_w' }), { first: 'Ali', last: '' });
  assert.deepEqual(nameParts({ full_name: 'ali_w', username: 'ali_w' }), { first: '', last: '' });
  assert.deepEqual(nameParts({ full_name: '  ', username: 'x' }), { first: '', last: '' });
  assert.deepEqual(nameParts({}), { first: '', last: '' });
  assert.deepEqual(nameParts({ full_name: 'Ali   Valiyev', username: 'x' }), { first: 'Ali', last: 'Valiyev' });
});

test('personalFromStaff: telefon va email bo\'sh/yo\'q bo\'lsa bo\'sh satr', () => {
  assert.deepEqual(personalFromStaff({ first_name: 'Ali', last_name: 'V', phone: ' +998901234567 ', email: null }), {
    first_name: 'Ali',
    last_name: 'V',
    phone: '+998901234567',
    email: '',
  });
  assert.deepEqual(personalFromStaff({ full_name: 'x', username: 'x' }), { first_name: '', last_name: '', phone: '', email: '' });
});

test('diffPersonal: o\'zgarish yo\'q -> {}; faqat o\'zgargani; bo\'sh joylar farq emas', () => {
  const saved = { first_name: 'Ali', last_name: 'Valiyev', phone: '+998901234567', email: '' };
  assert.deepEqual(diffPersonal(saved, { ...saved }), {});
  assert.deepEqual(diffPersonal(saved, { ...saved, first_name: ' Ali ' }), {});
  assert.deepEqual(diffPersonal(saved, { ...saved, phone: '+998909999999' }), { phone: '+998909999999' });
  assert.deepEqual(diffPersonal(saved, { ...saved, last_name: ' ', email: ' a@b.uz ' }), { last_name: '', email: 'a@b.uz' });
});

test('diffPersonal: maydonni tozalash ham o\'zgarish (bo\'sh satr yuboriladi)', () => {
  const saved = { first_name: 'Ali', last_name: 'V', phone: '+998901234567', email: 'a@b.uz' };
  assert.deepEqual(diffPersonal(saved, { first_name: 'Ali', last_name: 'V', phone: '', email: '' }), { phone: '', email: '' });
});

test('validatePersonal: bo\'sh maydonlar xato emas', () => {
  assert.deepEqual(validatePersonal({ first_name: '', last_name: '', phone: '', email: '' }), {});
});

test('validatePersonal: telefon (belgilar, raqamlar soni, uzunlik) va email', () => {
  const base = { first_name: 'A', last_name: 'B', phone: '', email: '' };
  assert.deepEqual(validatePersonal({ ...base, phone: '+998 90 123-45-67' }), {});
  assert.deepEqual(validatePersonal({ ...base, phone: '(90) 123 45 67' }), {});
  assert.deepEqual(validatePersonal({ ...base, phone: '90abc' }), { phone: 'phone' });
  assert.deepEqual(validatePersonal({ ...base, phone: '12345' }), { phone: 'phone' });
  assert.deepEqual(validatePersonal({ ...base, phone: '+' + '9'.repeat(25) }), { phone: 'too_long' });
  assert.deepEqual(validatePersonal({ ...base, email: 'ali@mail.uz' }), {});
  assert.deepEqual(validatePersonal({ ...base, email: 'ali@mail' }), { email: 'email' });
  assert.deepEqual(validatePersonal({ ...base, email: 'ali mail@x.uz' }), { email: 'email' });
  assert.deepEqual(validatePersonal({ ...base, email: 'a@' + 'b'.repeat(260) + '.uz' }), { email: 'too_long' });
  assert.deepEqual(validatePersonal({ ...base, first_name: 'x'.repeat(151) }), { first_name: 'too_long' });
  assert.deepEqual(validatePersonal({ ...base, last_name: 'x'.repeat(150) }), {});
});

test('checkUsername: chegaralar 3..30, faqat lotin harf/raqam/_ . -', () => {
  assert.equal(checkUsername(''), 'empty');
  assert.equal(checkUsername('   '), 'empty');
  assert.equal(checkUsername('ab'), 'short');
  assert.equal(checkUsername('abc'), null);
  assert.equal(checkUsername('a'.repeat(30)), null);
  assert.equal(checkUsername('a'.repeat(31)), 'long');
  assert.equal(checkUsername('ali_waiter-2.0'), null);
  assert.equal(checkUsername('ali waiter'), 'chars');
  assert.equal(checkUsername('aliyev@mail'), 'chars');
  assert.equal(checkUsername('alişer'), 'chars');
  assert.equal(checkUsername('Алишер'), 'chars');
  assert.equal(checkUsername(' ali '), null);
});

test('decideUsername: o\'zgarmagan login qayta tekshirilmaydi (eski uzun login buzilmaydi)', () => {
  const legacy = 'x'.repeat(40);
  assert.deepEqual(decideUsername(legacy, legacy), { changed: false, issue: null, value: legacy });
  assert.deepEqual(decideUsername('ali', ' ali '), { changed: false, issue: null, value: 'ali' });
});

test('decideUsername: o\'zgarsa tekshiriladi; registr farqi o\'zgarish (server Django login registrga sezgir)', () => {
  assert.deepEqual(decideUsername('ali', 'vali'), { changed: true, issue: null, value: 'vali' });
  assert.deepEqual(decideUsername('ali', 'Ali'), { changed: true, issue: null, value: 'Ali' });
  assert.deepEqual(decideUsername('ali', 'a'), { changed: true, issue: 'short', value: 'a' });
  assert.deepEqual(decideUsername('ali', ''), { changed: true, issue: 'empty', value: '' });
});

test('readProfileError: {error, field} -> maydon va xabar', () => {
  const error = Object.assign(new Error('x'), { status: 400, problem: { error: 'Bu login band', field: 'username' } });
  assert.deepEqual(readProfileError(error), { field: 'username', message: 'Bu login band', status: 400, forbidden: false });
});

test('readProfileError: maydonlar xaritasi (parol, ruxsatlar, ism) va noma\'lum maydon -> general', () => {
  const make = (field: string) => Object.assign(new Error('x'), { status: 400, problem: { error: 'xato', field } });
  assert.equal(readProfileError(make('password')).field, 'password');
  assert.equal(readProfileError(make('current_password')).field, 'current_password');
  assert.equal(readProfileError(make('extra_capabilities')).field, 'permissions');
  assert.equal(readProfileError(make('revoked_capabilities')).field, 'permissions');
  assert.equal(readProfileError(make('full_name')).field, 'first_name');
  assert.equal(readProfileError(make('role')).field, 'role');
  assert.equal(readProfileError(make('zzz')).field, 'general');
  assert.equal(readProfileError(make('constructor')).field, 'general');
  assert.equal(readProfileError(make('__proto__')).field, 'general');
});

test('readProfileError: 403 belgilanadi; {detail}; javob umuman kelmasa status 0; buzuq kirish', () => {
  assert.equal(readProfileError(Object.assign(new Error('x'), { status: 403, problem: { error: 'Ruxsat yo\'q' } })).forbidden, true);
  assert.equal(readProfileError(Object.assign(new Error('x'), { status: 400, problem: { detail: 'Detail xabari' } })).message, 'Detail xabari');
  assert.deepEqual(readProfileError(new TypeError('Failed to fetch')), { field: 'general', message: '', status: 0, forbidden: false });
  assert.deepEqual(readProfileError(null), { field: 'general', message: '', status: 0, forbidden: false });
  assert.deepEqual(readProfileError('xato'), { field: 'general', message: '', status: 0, forbidden: false });
  assert.deepEqual(readProfileError({ status: 500, problem: [] }), { field: 'general', message: '', status: 500, forbidden: false });
  assert.equal(readProfileError({ status: 400, problem: { error: '   ' } }).message, '');
});
