import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD_LIMITS,
  LIMITS,
  PRESET_COLORS,
  SWATCHES,
  brandFromResponse,
  buildPatch,
  defaultBrand,
  effectiveColors,
  looksLikeWebsite,
  mergePresetResult,
  normalizeBrand,
  previewColors,
  safeImageUrl,
  setModule,
  setText,
  stripBrandPrefix,
  validateBrand,
} from './brandModel.ts';
import { readFailure } from '../Bookings/errors.ts';
import { brandRoute } from './route.ts';
import { MODULE_KEYS } from './types.ts';
import type { Brand } from './types.ts';

const H = (digits: string): string => `#${digits}`;

const server = (): unknown => ({
  name: 'Guliston',
  tagline: 'Mazali taomlar',
  logo_url: '/media/brand/logo.png',
  favicon_url: null,
  palette: 'custom',
  primary_color: H('8B1E3F'),
  accent_color: H('B85D19'),
  adjusted: true,
  adjusted_from: H('d02050'),
  font: 'rounded',
  hero: { title: 'Xush kelibsiz', subtitle: '', cta_text: 'Menyu' },
  contact: { phone: '+998901234567', phone2: '', address: 'Guliston', instagram: '@guliston', telegram: '', website: 'guliston.uz', hours_text: '10:00-23:00' },
  modules: { menu: true, ar360: false, booking: true, tour: false, orders: true, waiter_call: true },
  business_type: 'banquet',
  terms: { table: 'Stol', guest: 'Mehmon', venue: "To'yxona" },
});

test('route: yo\'l va ruxsat', () => {
  assert.equal(brandRoute.path, 'brand');
  assert.equal(brandRoute.capability, 'settings_admin');
});

test('normalizeBrand: to\'liq javob o\'zgarishsiz o\'qiladi, rang kodlari normallashadi', () => {
  const brand = normalizeBrand(server());
  assert.equal(brand.name, 'Guliston');
  assert.equal(brand.palette, 'custom');
  assert.equal(brand.primary_color, H('8B1E3F'));
  assert.equal(brand.adjusted, true);
  assert.equal(brand.adjusted_from, H('D02050'));
  assert.equal(brand.font, 'rounded');
  assert.equal(brand.hero.cta_text, 'Menyu');
  assert.equal(brand.modules.ar360, false);
  assert.equal(brand.business_type, 'banquet');
  assert.deepEqual(brand.terms, { table: 'Stol', guest: 'Mehmon', venue: "To'yxona" });
});

test('normalizeBrand: bo\'sh/buzuq javob standart bilan to\'ladi, hech qachon tashlamaydi', () => {
  for (const raw of [null, undefined, 5, 'x', [], {}]) {
    const brand = normalizeBrand(raw);
    assert.deepEqual(brand, defaultBrand());
  }
  const weird = normalizeBrand({ palette: 'neon', font: 'comic', business_type: 'zavod', primary_color: 'xato', modules: { menu: 'ha' }, hero: 'x', contact: [], terms: { table: 5, guest: 'Mehmon' } });
  assert.equal(weird.palette, 'classic');
  assert.equal(weird.font, 'serif');
  assert.equal(weird.business_type, 'restaurant');
  assert.equal(weird.primary_color, PRESET_COLORS.classic.primary);
  assert.equal(weird.modules.menu, true, 'mantiqiy bo\'lmagan qiymat -> standart (yoqilgan)');
  assert.equal(weird.hero.title, '');
  assert.deepEqual(weird.terms, { guest: 'Mehmon' });
});

test('normalizeBrand: rasm manzili xavfsiz (javascript:/data: rad etiladi)', () => {
  assert.equal(safeImageUrl('/media/a.png'), '/media/a.png');
  assert.equal(safeImageUrl('https://cdn.example.org/a.png'), 'https://cdn.example.org/a.png');
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.example/a.png', '', '   ', null, 5]) assert.equal(safeImageUrl(bad), null, String(bad));
  assert.equal(normalizeBrand({ logo_url: 'javascript:alert(1)' }).logo_url, null);
});

test('brandFromResponse: {brand} yoki to\'g\'ridan-to\'g\'ri brend; brend yo\'q bo\'lsa null', () => {
  assert.equal(brandFromResponse({ id: 1, name: 'Do\'kon' }), null);
  assert.equal(brandFromResponse(null), null);
  assert.equal(brandFromResponse({ brand: server() })?.name, 'Guliston');
  assert.equal(brandFromResponse(server())?.name, 'Guliston');
});

test('buildPatch: o\'zgarish yo\'q -> bo\'sh', () => {
  const saved = normalizeBrand(server());
  assert.deepEqual(buildPatch(saved, { ...saved }), { patch: {}, paths: [] });
  // faqat bo'sh joy farqi o'zgarish emas
  assert.deepEqual(buildPatch(saved, setText(saved, 'name', '  Guliston  ')).paths, []);
});

test('buildPatch: faqat o\'zgargan kalitlar (ichma-ich obyektlar ham)', () => {
  const saved = normalizeBrand(server());
  let draft = setText(saved, 'name', ' Yangi nom ');
  draft = setText(draft, 'hero.title', 'Salom');
  draft = setText(draft, 'contact.phone', '+998911112233');
  draft = setModule(draft, 'ar360', true);
  draft = { ...draft, font: 'sans' };
  const { patch, paths } = buildPatch(saved, draft);
  assert.deepEqual(patch, { name: 'Yangi nom', font: 'sans', hero: { title: 'Salom' }, contact: { phone: '+998911112233' }, modules: { ar360: true } });
  assert.deepEqual(paths.sort(), ['contact.phone', 'font', 'hero.title', 'modules.ar360', 'name']);
});

test('buildPatch: matnni bo\'shatish (standartga qaytarish) yuboriladi', () => {
  const saved = normalizeBrand(server());
  const { patch } = buildPatch(saved, setText(saved, 'hero.title', ''));
  assert.deepEqual(patch, { hero: { title: '' } });
});

test('buildPatch: rang faqat custom palitrada yuboriladi', () => {
  const saved = normalizeBrand({ ...(server() as object), palette: 'classic', primary_color: PRESET_COLORS.classic.primary, adjusted: false });
  // tayyor palitrada rang maydoni o'zgarsa ham yuborilmaydi
  assert.deepEqual(buildPatch(saved, { ...saved, primary_color: H('112233') }), { patch: {}, paths: [] });
  // palitra almashtirildi: faqat palitra
  assert.deepEqual(buildPatch(saved, { ...saved, palette: 'orange' }), { patch: { palette: 'orange' }, paths: ['palette'] });
});

test('buildPatch: custom ga o\'tish — ikki rang ham yuboriladi, lekin bitta o\'zgarish sanaladi', () => {
  const saved = normalizeBrand({ ...(server() as object), palette: 'classic', primary_color: PRESET_COLORS.classic.primary, accent_color: PRESET_COLORS.classic.accent, adjusted: false });
  const { patch, paths } = buildPatch(saved, { ...saved, palette: 'custom' });
  assert.deepEqual(patch, { palette: 'custom', primary_color: PRESET_COLORS.classic.primary, accent_color: PRESET_COLORS.classic.accent });
  assert.deepEqual(paths, ['palette']);
  // custom ga o'tib, rangni ham o'zgartirsa — rang ham sanaladi
  const changed = buildPatch(saved, { ...saved, palette: 'custom', primary_color: H('112233') });
  assert.equal(changed.patch.primary_color, H('112233'));
  assert.deepEqual(changed.paths, ['palette', 'primary_color']);
});

test('buildPatch: custom palitrada rang o\'zgardi (kichik harf ham bir xil rang)', () => {
  const saved = normalizeBrand(server());
  assert.deepEqual(buildPatch(saved, { ...saved, primary_color: H('8b1e3f') }), { patch: {}, paths: [] });
  const next = buildPatch(saved, { ...saved, primary_color: H('1e3a5f') });
  assert.deepEqual(next, { patch: { primary_color: H('1E3A5F') }, paths: ['primary_color'] });
  // yaroqsiz (yozilayotgan) rang yuborilmaydi, lekin o'zgarish sanaladi: Saqlash bosilganda validateBrand xatoni ko'rsatadi
  assert.deepEqual(buildPatch(saved, { ...saved, primary_color: H('1E3A') }), { patch: {}, paths: ['primary_color'] });
});

test('buildPatch: rasmlar, atamalar, biznes turi va adjusted* hech qachon patchga tushmaydi', () => {
  const saved = normalizeBrand(server());
  const draft: Brand = { ...saved, logo_url: null, favicon_url: '/x.png', business_type: 'cafe', terms: { table: 'Joy' }, adjusted: false, adjusted_from: null };
  assert.deepEqual(buildPatch(saved, draft), { patch: {}, paths: [] });
});

test('validateBrand: standart brend toza; uzunlik, rang, telefon, sayt', () => {
  assert.deepEqual(validateBrand(defaultBrand()), []);
  const saved = normalizeBrand(server());
  assert.deepEqual(validateBrand(saved), []);

  const long = setText(saved, 'name', 'a'.repeat(LIMITS.name + 1));
  assert.deepEqual(validateBrand(long), [{ path: 'name', code: 'too_long', max: LIMITS.name }]);
  assert.deepEqual(validateBrand(setText(saved, 'name', 'a'.repeat(LIMITS.name))), [], 'aynan chegara o\'tadi');
  // kesilgandan keyin hisoblanadi (bo'sh joy sanalmaydi)
  assert.deepEqual(validateBrand(setText(saved, 'name', ` ${'a'.repeat(LIMITS.name)} `)), []);
  // 'emoji' bitta belgi sifatida (kod nuqtasi bo'yicha)
  assert.deepEqual(validateBrand(setText(saved, 'name', '😀'.repeat(LIMITS.name))), []);

  assert.deepEqual(validateBrand({ ...saved, primary_color: H('8B1E') }), [{ path: 'primary_color', code: 'bad_color' }]);
  // tayyor palitrada rang maydoni tekshirilmaydi
  assert.deepEqual(validateBrand({ ...saved, palette: 'orange', primary_color: 'xato' }), []);

  assert.deepEqual(validateBrand(setText(saved, 'contact.phone', 'salom')), [{ path: 'contact.phone', code: 'bad_phone' }]);
  assert.deepEqual(validateBrand(setText(saved, 'contact.phone2', '123')), [{ path: 'contact.phone2', code: 'bad_phone' }]);
  assert.deepEqual(validateBrand(setText(saved, 'contact.phone2', '+998 (90) 123-45-67')), []);
  assert.deepEqual(validateBrand(setText(saved, 'contact.website', 'bu sayt emas')), [{ path: 'contact.website', code: 'bad_website' }]);
});

/** backend/shops/brand.py: NAME_MAX, TAGLINE_MAX, HERO_LIMITS, parse_phone (20), ADDRESS_MAX, URL_MAX (Instagram/Telegram), WEBSITE_MAX, HOURS_TEXT_MAX */
const SERVER_LIMITS: Record<string, number> = {
  name: 60,
  tagline: 120,
  'hero.title': 80,
  'hero.subtitle': 240,
  'hero.cta_text': 40,
  'contact.phone': 20,
  'contact.phone2': 20,
  'contact.address': 300,
  'contact.instagram': 200,
  'contact.telegram': 200,
  'contact.website': 120,
  'contact.hours_text': 160,
};

const tooLong = (brand: Brand, saved?: Brand) => validateBrand(brand, saved).filter((issue) => issue.code === 'too_long');

test('FIELD_LIMITS: serverdagi (backend/shops/brand.py) chegaralar bilan aynan bir xil', () => {
  assert.deepEqual(FIELD_LIMITS, SERVER_LIMITS);
  assert.equal(LIMITS.name, 60);
  assert.equal(LIMITS.phone, 20);
  assert.equal(LIMITS.website, 120);
});

test('validateBrand: har maydonda aynan chegara o\'tadi, chegaradan 1 ta ortiq `too_long` beradi', () => {
  const saved = normalizeBrand(server());
  for (const [path, max] of Object.entries(SERVER_LIMITS)) {
    // telefon: 20 belgili to'g'ri raqam; qolganlari: oddiy harf (faqat uzunlik tekshiriladi)
    const phone = path.startsWith('contact.phone');
    const fill = (n: number) => (phone ? `${'+998 90 123 45 67 1234567890'.slice(0, n)}` : 'a'.repeat(n));
    assert.deepEqual(tooLong(setText(saved, path, fill(max)), saved), [], `${path}: ${max} belgi o'tishi kerak`);
    assert.deepEqual(tooLong(setText(saved, path, fill(max + 1)), saved), [{ path, code: 'too_long', max }], `${path}: ${max + 1} belgi rad etilishi kerak`);
  }
});

test('validateBrand: uzunlik serverdagidek sanaladi — ketma-ket bo\'shliqlar bitta, kod nuqtalari bo\'yicha', () => {
  const saved = normalizeBrand(server());
  const spaced = `a${' '.repeat(10)}${'b'.repeat(LIMITS.name - 2)}`; // 1 + 1 bo'shliq + 58 = 60 (yig'ilgandan keyin)
  assert.deepEqual(tooLong(setText(saved, 'name', spaced), saved), []);
  assert.deepEqual(tooLong(setText(saved, 'name', `${spaced}c`), saved), [{ path: 'name', code: 'too_long', max: LIMITS.name }]);
  assert.deepEqual(tooLong(setText(saved, 'tagline', '😀'.repeat(LIMITS.tagline)), saved), []);
});

test('validateBrand(draft, saved): o\'zgarmagan eski uzun qiymat (32 belgili telefon, 70 belgili nom) saqlashga xalaqit bermaydi', () => {
  const legacy = normalizeBrand({ ...(server() as object), name: 'N'.repeat(70), contact: { ...(server() as { contact: object }).contact, phone: '+998 90 123 45 67 (ofis, 9-18) 1', website: `guliston.uz/${'p'.repeat(130)}` } });
  assert.deepEqual(validateBrand(legacy, legacy), [], 'o\'zgarmagan maydonlar tekshirilmaydi (server ham ularni ko\'rmaydi)');
  const other = setText(legacy, 'tagline', 'Yangi shior');
  assert.deepEqual(validateBrand(other, legacy), []);
  // saved berilmasa to'liq tekshiruv (eski xatti-harakat)
  assert.deepEqual(validateBrand(legacy).map((issue) => `${issue.path}:${issue.code}`).sort(), ['contact.phone:bad_phone', 'contact.phone:too_long', 'contact.website:too_long', 'name:too_long']);
  // maydonga tegilsa — tekshiriladi
  assert.deepEqual(tooLong(setText(legacy, 'name', 'M'.repeat(61)), legacy), [{ path: 'name', code: 'too_long', max: 60 }]);
  assert.deepEqual(tooLong(setText(legacy, 'contact.phone', '+998 90 123 45 67 1234'), legacy), [{ path: 'contact.phone', code: 'too_long', max: 20 }]);
  // faqat bo'sh joy farqi — o'zgarish emas
  assert.deepEqual(validateBrand(setText(legacy, 'name', ` ${'N'.repeat(70)} `), legacy), []);
});

test('validateBrand: telefon serverdagi qoida bilan bir xil (raqam bilan boshlanadi, 7-15 raqam, 20 belgigacha)', () => {
  const saved = normalizeBrand(server());
  const codes = (phone: string) => validateBrand(setText(saved, 'contact.phone', phone), saved).map((issue) => issue.code);
  for (const ok of ['+998 90 123 45 67', '+998 (90) 123-45-67', '998901234567', '90 123 45 67', '+998   90 123 45 67']) assert.deepEqual(codes(ok), [], ok);
  for (const bad of ['(90) 123 45 67', '-998901234567', '+998', '12345', '1234567890123456', 'salom', '+998 90 123.45.67']) assert.deepEqual(codes(bad), ['bad_phone'], bad);
});

test('looksLikeWebsite: serverdagi (_website) qoida — faqat https:// yoki sxemasiz domen', () => {
  for (const ok of ['guliston.uz', 'https://guliston.uz', 'HTTPS://Guliston.UZ/Menu?x=1#a', 'www.guliston.uz/menu', 'sub.guliston.co.uz', 'https://xn--80aaaa.uz/path_a-b~c%20d', ' guliston.uz ']) {
    assert.equal(looksLikeWebsite(ok), true, ok);
  }
  for (const bad of ['', 'guliston', 'a b.uz', 'https://', 'localhost', 'http://.uz', 'guliston.u', 'guliston.uz1', 'guliston..uz', '-guliston.uz', 'https://guliston', 'https://guliston.uz/a b', 'x.uz/a://b']) {
    assert.equal(looksLikeWebsite(bad), false, bad);
  }
  // ONGLI o'zgartirish: server `http://` ni rad etadi ("Veb-sayt manzili https:// bilan boshlanishi kerak"); avval mijoz uni qabul qilardi
  for (const http of ['http://guliston.uz', 'HTTP://guliston.uz', 'http://www.guliston.uz/menu', '  http://guliston.uz']) assert.equal(looksLikeWebsite(http), false, http);
  // boshqa sxema, port, kirish ma'lumoti: server rad etadi
  for (const bad of ['ftp://guliston.uz', 'javascript://guliston.uz', 'guliston.uz:8080', 'https://guliston.uz:443', 'https://user:pw@guliston.uz', 'https://user@guliston.uz', 'user@guliston.uz', 'https://@guliston.uz']) {
    assert.equal(looksLikeWebsite(bad), false, bad);
  }
  // ASCII bo'lmagan belgi (kirill/IDN) va xavfli belgilar
  for (const bad of ['гулистон.uz', 'guliston.uz/меню', 'guliston.uz/"x"', 'guliston.uz/<a>', 'https://[::1]/']) assert.equal(looksLikeWebsite(bad), false, bad);
  // domen bo'lagi uzunligi: 63 belgigacha, oxirgi bo'lak 2-24 harf
  assert.equal(looksLikeWebsite(`${'a'.repeat(63)}.uz`), true);
  assert.equal(looksLikeWebsite(`${'a'.repeat(64)}.uz`), false);
  assert.equal(looksLikeWebsite(`guliston.${'a'.repeat(24)}`), true);
  assert.equal(looksLikeWebsite(`guliston.${'a'.repeat(25)}`), false);
});

test('validateBrand: http:// sayt alohida kod (insecure_website) bilan, boshqa noto\'g\'ri sayt bad_website', () => {
  const saved = normalizeBrand(server());
  const codes = (website: string) => validateBrand(setText(saved, 'contact.website', website), saved).map((issue) => `${issue.path}:${issue.code}`);
  assert.deepEqual(codes('http://guliston.uz'), ['contact.website:insecure_website']);
  assert.deepEqual(codes('HTTP://guliston.uz'), ['contact.website:insecure_website']);
  assert.deepEqual(codes('https://guliston.uz'), []);
  assert.deepEqual(codes('guliston.uz'), []);
  assert.deepEqual(codes('localhost'), ['contact.website:bad_website']);
  assert.deepEqual(codes('guliston.uz:8080'), ['contact.website:bad_website']);
  // o'zgarmagan eski http:// qiymat saqlashga xalaqit bermaydi (server uni ko'rmaydi)
  const legacy = normalizeBrand({ ...(server() as object), contact: { ...(server() as { contact: object }).contact, website: 'http://eski.uz' } });
  assert.deepEqual(validateBrand(legacy, legacy), []);
  assert.deepEqual(validateBrand(setText(legacy, 'hero.title', 'Salom'), legacy), []);
});

test('FIELD_LIMITS: har matn maydoni uchun chegara bor', () => {
  for (const path of ['name', 'tagline', 'hero.title', 'hero.subtitle', 'hero.cta_text', 'contact.phone', 'contact.phone2', 'contact.address', 'contact.instagram', 'contact.telegram', 'contact.website', 'contact.hours_text']) {
    assert.ok(FIELD_LIMITS[path] > 0, path);
  }
});

test('server 400 {error, field: "brand.…"} -> maydon yo\'li formadagi maydonga to\'g\'ri keladi (xabar maydon yonida chiqadi)', () => {
  for (const path of Object.keys(SERVER_LIMITS)) {
    const failure = readFailure(Object.assign(new Error('Xato'), { status: 400, problem: { error: '60 belgidan oshmasligi kerak (hozir: 70)', field: `brand.${path}` } }));
    assert.equal(failure.status, 400);
    assert.equal(failure.message, '60 belgidan oshmasligi kerak (hozir: 70)');
    assert.equal(stripBrandPrefix(failure.field), path);
    assert.ok(path in FIELD_LIMITS, `${path}: sahifa tagidagi xabarda maydon nomi ko'rsatiladi`);
  }
});

test('stripBrandPrefix', () => {
  assert.equal(stripBrandPrefix('brand.hero.title'), 'hero.title');
  assert.equal(stripBrandPrefix('brand.name'), 'name');
  assert.equal(stripBrandPrefix('name'), 'name');
  assert.equal(stripBrandPrefix(''), '');
});

test('setText/setModule o\'zgarmas: asl obyekt buzilmaydi', () => {
  const saved = normalizeBrand(server());
  const copy = JSON.stringify(saved);
  const next = setText(setModule(saved, 'tour', true), 'hero.subtitle', 'Tavsif');
  assert.equal(JSON.stringify(saved), copy);
  assert.equal(next.hero.subtitle, 'Tavsif');
  assert.equal(next.modules.tour, true);
  assert.equal(setText(saved, 'yoq.joy', 'x'), saved, 'noma\'lum yo\'l: o\'zgarishsiz');
});

test('mergePresetResult: faqat biznes turi, atamalar va bo\'limlar almashadi; boshqa tahrirlar qoladi', () => {
  const saved = normalizeBrand(server());
  const draft = setText(saved, 'name', 'Tahrirdagi nom');
  const applied: Brand = { ...saved, business_type: 'cafe', terms: { table: 'Joy' }, modules: { ...saved.modules, tour: true, ar360: true }, name: 'Serverdagi nom' };
  const merged = mergePresetResult(draft, applied);
  assert.equal(merged.name, 'Tahrirdagi nom');
  assert.equal(merged.business_type, 'cafe');
  assert.deepEqual(merged.terms, { table: 'Joy' });
  assert.equal(merged.modules.tour, true);
});

test('effectiveColors: custom — kiritilgan rang; yaroqsiz bo\'lsa oxirgi saqlangan; tayyor — palitra', () => {
  const saved = normalizeBrand(server());
  assert.deepEqual(effectiveColors({ ...saved, primary_color: H('112233') }, saved), { primary: H('112233'), accent: saved.accent_color });
  assert.equal(effectiveColors({ ...saved, primary_color: H('11') }, saved).primary, saved.primary_color);
  assert.deepEqual(effectiveColors({ ...saved, palette: 'orange' }, saved), PRESET_COLORS.orange);
  assert.deepEqual(effectiveColors({ ...saved, palette: 'classic' }, null), PRESET_COLORS.classic);
  // tayyor palitra saqlangan bo'lsa serverning o'z qiymati
  const classicSaved = normalizeBrand({ palette: 'classic', primary_color: H('112233'), accent_color: H('445566') });
  assert.deepEqual(effectiveColors({ ...classicSaved }, classicSaved), { primary: H('112233'), accent: H('445566') });
});

test('MODULE_KEYS: oltita bo\'lim, shartnomadagi nomlar', () => {
  assert.deepEqual([...MODULE_KEYS], ['menu', 'ar360', 'booking', 'tour', 'orders', 'waiter_call']);
  assert.equal(SWATCHES.length, 8);
});

test('previewColors: custom — och asosiy rang to\'qlashadi, yetarli rang va tayyor palitra o\'zgarmaydi', () => {
  const saved = normalizeBrand(server());
  assert.equal(previewColors({ ...saved, primary_color: H('8B1E3F') }, saved).primary, H('8B1E3F'));
  const light = previewColors({ ...saved, primary_color: H('FFFF00') }, saved).primary;
  assert.notEqual(light, H('FFFF00'));
  assert.deepEqual(previewColors({ ...saved, palette: 'orange' }, saved), PRESET_COLORS.orange, 'tayyor palitra o\'zgarmaydi (apelsin oq bilan 4.5 dan past — mehmon saytida ham shunday)');
  assert.equal(previewColors({ ...saved, primary_color: H('FFFF00') }, saved).accent, saved.accent_color);
});
