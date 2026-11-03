import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccessMessage,
  buildInviteMessage,
  buildShareTexts,
  buildTelegramShareUrl,
  copyText,
  firstName,
  planShare,
  type InviteInput,
} from './access.ts';
import { restoUz } from '../../i18n/uz.ts';
import { translate, type Lang } from '../../../../shared/src/i18n/core.ts';
import ruCore from '../../i18n/ru/core.ts';
import ruStaff from '../../i18n/ru/staff.ts';
import enCore from '../../i18n/en/core.ts';
import enStaff from '../../i18n/en/staff.ts';

const LINK = 'https://menu.example.uz/admin/login/?next=/waiter/panel/';
const BASE: InviteInput = {
  name: 'Ali Valiyev',
  restaurant: 'Guliston',
  roleTitle: 'ofitsiant',
  loginUrl: LINK,
  username: 'ali_waiter',
};

// ─── Xabar matni ─────────────────────────────────────────────────────────────

test('buildInviteMessage: parolsiz — salom, lavozim, havola va login', () => {
  assert.equal(
    buildInviteMessage(BASE),
    `Salom, Ali! Siz Gulistonga ofitsiant sifatida qo'shildingiz. Kirish: ${LINK}\nLogin: ali_waiter`,
  );
});

test('buildInviteMessage: parol berilsa oxirgi qatorda "Parol:"', () => {
  assert.equal(
    buildInviteMessage({ ...BASE, password: 'Sir-Parol-77' }),
    `Salom, Ali! Siz Gulistonga ofitsiant sifatida qo'shildingiz. Kirish: ${LINK}\nLogin: ali_waiter\nParol: Sir-Parol-77`,
  );
});

test('buildInviteMessage: bo\'sh parol qator qo\'shmaydi', () => {
  assert.doesNotMatch(buildInviteMessage({ ...BASE, password: '' }), /Parol/);
});

test('buildInviteMessage: ism va restoran nomi bo\'sh bo\'lsa ham matn buzilmaydi', () => {
  const text = buildInviteMessage({ ...BASE, name: '   ', restaurant: '', roleTitle: '' });
  assert.equal(text.split('\n')[0], `Salom! Siz restoranga xodim sifatida qo'shildingiz. Kirish: ${LINK}`);
});

test('buildInviteMessage: havolasiz variant (Telegram url= alohida ketadi)', () => {
  const text = buildInviteMessage({ ...BASE, password: 'Sir' }, { withLink: false });
  assert.equal(text, `Salom, Ali! Siz Gulistonga ofitsiant sifatida qo'shildingiz.\nLogin: ali_waiter\nParol: Sir`);
  assert.doesNotMatch(text, /https?:/);
});

test('firstName: birinchi so\'z, ortiqcha bo\'sh joylarsiz', () => {
  assert.equal(firstName('  Ali   Valiyev '), 'Ali');
  assert.equal(firstName('zarina'), 'zarina');
  assert.equal(firstName(''), '');
});

test('buildAccessMessage: mavjud xodimga qayta yuborish ("qo\'shildingiz" yo\'q)', () => {
  const text = buildAccessMessage({ name: 'Ali Valiyev', loginUrl: LINK, username: 'ali_waiter', panelLabel: 'Ofitsiant paneli' });
  assert.equal(text, `Salom, Ali! Kirish havolasi (Ofitsiant paneli): ${LINK}\nLogin: ali_waiter`);
  assert.doesNotMatch(text, /qo'shildingiz/);
  const plain = buildAccessMessage({ name: 'Ali', loginUrl: LINK, username: 'ali', panelLabel: '' }, { withLink: false });
  assert.equal(plain, 'Salom, Ali! Kirish havolasi.\nLogin: ali');
});

// ─── Ulashish ────────────────────────────────────────────────────────────────

test('buildTelegramShareUrl: havola va matn to\'liq kodlanadi (&, #, qator, apostrof)', () => {
  const url = buildTelegramShareUrl('https://x.uz/admin/login/?next=/kds/&a=1#h', "Salom, Ali!\nLogin: a&b #1 o'z");
  assert.ok(url.startsWith('https://t.me/share/url?url='));
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://t.me/share/url');
  assert.equal(parsed.searchParams.get('url'), 'https://x.uz/admin/login/?next=/kds/&a=1#h');
  assert.equal(parsed.searchParams.get('text'), "Salom, Ali!\nLogin: a&b #1 o'z");
  assert.equal([...parsed.searchParams.keys()].length, 2);
});

test('buildShareTexts: Telegram matni hech qachon parol va havola saqlamaydi', () => {
  const texts = buildShareTexts({ ...BASE, password: 'Maxfiy-Parol-99' }, 'invite');
  assert.match(texts.full, /Maxfiy-Parol-99/);
  assert.match(texts.full, /Kirish: https:/);
  assert.doesNotMatch(texts.plain, /Maxfiy-Parol-99/);
  assert.doesNotMatch(texts.plain, /https?:/);
  assert.doesNotMatch(texts.plain, /Parol/);
  assert.match(texts.plain, /Login: ali_waiter/);
});

test('buildShareTexts: access turi — parol faqat berilsa to\'liq matnda, Telegram matnida hech qachon', () => {
  const withPass = buildShareTexts({ ...BASE, password: 'Sir-1', panelLabel: 'Ofitsiant paneli' }, 'access');
  assert.match(withPass.full, /^Salom, Ali! Kirish havolasi \(Ofitsiant paneli\): https:/);
  assert.match(withPass.full, /\nParol: Sir-1$/);
  assert.doesNotMatch(withPass.plain, /Sir-1|Parol|https?:/);
  // profildan ulashishda (parol berilmaydi) parol qatori umuman yo'q
  const noPass = buildShareTexts({ ...BASE, panelLabel: 'Ofitsiant paneli' }, 'access');
  assert.doesNotMatch(noPass.full + noPass.plain, /Parol/);
});

test('planShare: navigator.share bor — tizim oynasi, to\'liq matn bilan', () => {
  const texts = buildShareTexts({ ...BASE, password: 'Sir-1' }, 'invite');
  const plan = planShare({ canNativeShare: true, title: 'Restoranga kirish', loginUrl: LINK, texts });
  assert.deepEqual(plan, { kind: 'native', title: 'Restoranga kirish', text: texts.full });
});

test('planShare: navigator.share yo\'q — Telegram havolasi, parol URL\'da YO\'Q', () => {
  const texts = buildShareTexts({ ...BASE, password: 'Sir-Parol-1' }, 'invite');
  const plan = planShare({ canNativeShare: false, title: 'x', loginUrl: LINK, texts });
  assert.equal(plan.kind, 'telegram');
  if (plan.kind !== 'telegram') return;
  assert.ok(plan.url.startsWith('https://t.me/share/url?url='));
  assert.ok(!decodeURIComponent(plan.url).includes('Sir-Parol-1'));
  assert.ok(!plan.url.includes('Sir-Parol-1'));
  assert.equal(new URL(plan.url).searchParams.get('url'), LINK);
});

// ─── Nusxa olish ─────────────────────────────────────────────────────────────

test('copyText: clipboard ishlasa zaxira chaqirilmaydi', async () => {
  const calls: string[] = [];
  const ok = await copyText('abc', {
    writeText: async (t) => { calls.push(`clip:${t}`); },
    legacyCopy: (t) => { calls.push(`legacy:${t}`); return true; },
  });
  assert.equal(ok, true);
  assert.deepEqual(calls, ['clip:abc']);
});

test('copyText: clipboard rad etsa (rad etilgan promise) zaxira yo\'liga o\'tadi', async () => {
  const calls: string[] = [];
  const ok = await copyText('abc', {
    writeText: async () => { throw new Error('NotAllowedError'); },
    legacyCopy: (t) => { calls.push(t); return true; },
  });
  assert.equal(ok, true);
  assert.deepEqual(calls, ['abc']);
});

test('copyText: clipboard sinxron xato tashlasa ham zaxira ishlaydi', async () => {
  const ok = await copyText('abc', {
    writeText: () => { throw new Error('sync'); },
    legacyCopy: () => true,
  });
  assert.equal(ok, true);
});

test('copyText: navigator.clipboard yo\'q (http sahifa) — faqat zaxira', async () => {
  assert.equal(await copyText('abc', { writeText: null, legacyCopy: () => true }), true);
  assert.equal(await copyText('abc', { legacyCopy: () => false }), false);
});

test('copyText: hech qaysi yo\'l ishlamasa false (xato tashlamaydi)', async () => {
  assert.equal(await copyText('abc', {}), false);
  assert.equal(await copyText('abc', { writeText: async () => { throw new Error('x'); } }), false);
  assert.equal(
    await copyText('abc', { writeText: null, legacyCopy: () => { throw new Error('boom'); } }),
    false,
  );
});

// ─── Matnlar (uz.ts) ─────────────────────────────────────────────────────────

test('uz.ts: kirish bo\'limi — 3 qadamli yo\'riqnoma va parol haqidagi eslatma', () => {
  const a = restoUz.staffPage.access;
  assert.equal(a.steps.length, 3);
  assert.match(a.steps[0], /telefonda oching/);
  assert.match(a.steps[1], /Login va parol/);
  assert.match(a.steps[2], /Bosh ekranga qo'shish/);
  assert.match(a.passwordHelp, /Parolni almashtirish/);
  assert.equal(a.createdTitle, "Xodim qo'shildi");
  assert.equal(a.includePassword, "Parolni xabarga qo'shish");
  assert.equal(a.copied, 'Nusxalandi');
});

// ─── Xabar tillari (admin paneli tilida yoziladi) ────────────────────────────

const dictionaries: Record<'ru' | 'en', Record<string, string>> = {
  ru: { ...ruCore, ...ruStaff },
  en: { ...enCore, ...enStaff },
};
const translator = (lang: Exclude<Lang, 'uz'>) => (key: string, params?: Record<string, string | number>) =>
  translate(lang, dictionaries[lang], key, params);

test('xabar (ru): taklif, kirish havolasi va parol ruscha; havola va login/parol qiymatlari o\'zgarmaydi', () => {
  const t = translator('ru');
  assert.equal(
    buildInviteMessage({ ...BASE, roleTitle: 'официант', password: 'Sir-1' }, { t }),
    `Здравствуйте, Ali! Вас добавили в «Guliston» как официант. Вход: ${LINK}\nЛогин: ali_waiter\nПароль: Sir-1`,
  );
  const access = buildAccessMessage({ name: 'Ali Valiyev', loginUrl: LINK, username: 'ali_waiter', panelLabel: 'Панель официанта' }, { t });
  assert.equal(access, `Здравствуйте, Ali! Ссылка для входа (Панель официанта): ${LINK}\nЛогин: ali_waiter`);
});

test('xabar (en): taklif va ismsiz salom; ism va restoran bo\'sh bo\'lsa tarjima qilingan zaxira so\'zlar', () => {
  const t = translator('en');
  const text = buildInviteMessage({ ...BASE, name: '  ', restaurant: '', roleTitle: '' }, { t, withLink: false });
  assert.equal(text, `Hi! You've been added to restaurant as staff member.\nUsername: ali_waiter`);
});

test('xabar: buildShareTexts tarjimani uzatadi, Telegram matni baribir parolsiz va havolasiz', () => {
  const texts = buildShareTexts({ ...BASE, roleTitle: 'официант', password: 'Maxfiy-77' }, 'invite', translator('ru'));
  assert.match(texts.full, /^Здравствуйте, Ali! Вас добавили/);
  assert.match(texts.full, /Пароль: Maxfiy-77$/);
  assert.doesNotMatch(texts.plain, /Maxfiy-77|https?:|Пароль/);
});
