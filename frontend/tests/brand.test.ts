import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_BRAND, DEFAULT_TERMS, PRESET_TERMS, applyBrand, applyTerms, brandName, cleanColor, cleanText, contactItems, getBrand, heroTextFor,
  isCustomTerm, isPresetTerm, moduleEnabled, moduleEnabledIn, parseBrand, safeImageUrl, socialLink, telHref, term, useBrand, websiteLink,
} from '../src/utils/brand.ts';
import { BOOKING_BASE_PATH, TOUR_PATH } from '../src/pages/TourPage/paths.ts';
import { applyGuestPalette, chromeColors, currentPalette, getGuestPalette, parseGuestPalette } from '../src/utils/guestPalette.ts';
import { applyGuestSeason } from '../src/utils/guestSeason.ts';

const g = globalThis as unknown as Record<string, unknown>;

/** Brauzersiz muhit: sessiya + soxta document (sarlavha, favicon, <html> atributlari). */
function withSession(session: unknown, run: (doc: FakeDoc) => void) {
  const doc = fakeDoc();
  g.window = { __GULISTON_SESSION__: session };
  g.document = doc;
  try {
    run(doc);
  } finally {
    delete g.window;
    delete g.document;
  }
}

interface FakeLink { rel: string; href: string; type?: string; removeAttribute(name: string): void }
interface FakeDoc {
  title: string;
  documentElement: { dataset: Record<string, string> };
  head: { children: FakeLink[]; appendChild(l: FakeLink): void };
  links: FakeLink[];
  querySelectorAll(sel: string): FakeLink[];
  createElement(tag: string): FakeLink;
}

function fakeDoc(existingIcons: string[] = []): FakeDoc {
  const links: FakeLink[] = existingIcons.map((href) => makeLink(href, 'image/svg+xml'));
  const doc: FakeDoc = {
    title: 'Eski sarlavha',
    documentElement: { dataset: {} },
    head: { children: links, appendChild: (l) => { links.push(l); } },
    links,
    querySelectorAll: (sel) => (sel.includes('icon') ? links.filter((l) => l.rel.split(' ').includes('icon') || l.rel === 'shortcut icon') : []),
    createElement: () => makeLink('', undefined),
  };
  return doc;
}

function makeLink(href: string, type?: string): FakeLink {
  const link: FakeLink = { rel: 'icon', href, type, removeAttribute(name) { if (name === 'type') delete link.type; } };
  return link;
}

const FULL = {
  name: 'Shohjaxon Saroyi',
  tagline: "To'y va ziyofatlar",
  logo_url: '/media/brand/shop_3/logo.webp',
  favicon_url: '/media/brand/shop_3/fav.png',
  palette: 'custom',
  primary_color: '#2f4836',
  font: 'sans',
  hero: { title: 'Xush kelibsiz', subtitle: 'Eng yaxshi zal', cta_text: 'Zalni ko‘rish' },
  contact: { phone: '+998 90 123 45 67', phone2: '', address: 'Guliston sh., Mustaqillik 1', instagram: '@shohjaxon', telegram: 't.me/shohjaxon', website: 'shohjaxon.uz', hours_text: 'Har kuni 10:00–23:00' },
  modules: { menu: true, ar360: false, booking: true, tour: true, orders: false, waiter_call: true },
  terms: { table: 'Zal', guest: 'Mijoz', venue: "To'yxona" },
};

// ─── Himoyalangan o'qish ──────────────────────────────────────────────────────

test('parseBrand: brend yo\'q yoki obyekt emas -> standart (present=false), hamma bo\'lim yoqiq, atamalar standart', () => {
  for (const bad of [undefined, null, 'x', 5, true, [], [1, 2]]) {
    const b = parseBrand(bad);
    assert.equal(b, DEFAULT_BRAND, String(bad));
    assert.equal(b.present, false);
  }
  assert.deepEqual(DEFAULT_BRAND.modules, { menu: true, ar360: true, booking: true, tour: true, orders: true, waiter_call: true });
  assert.deepEqual(DEFAULT_BRAND.terms, { table: 'Stol', guest: 'Mehmon', venue: 'Restoran' });
  assert.equal(DEFAULT_BRAND.logoUrl, null);
  assert.equal(DEFAULT_BRAND.name, '');
});

test('parseBrand: to\'liq brend to\'g\'ri o\'qiladi', () => {
  const b = parseBrand(FULL);
  assert.equal(b.present, true);
  assert.equal(b.name, 'Shohjaxon Saroyi');
  assert.equal(b.logoUrl, '/media/brand/shop_3/logo.webp');
  assert.equal(b.palette, 'custom');
  assert.equal(b.primaryColor, '#2F4836');
  assert.equal(b.font, 'sans');
  assert.equal(b.hero.ctaText, 'Zalni ko‘rish');
  assert.equal(b.contact.hoursText, 'Har kuni 10:00–23:00');
  assert.equal(b.modules.ar360, false);
  assert.equal(b.modules.menu, true);
  assert.equal(b.terms.table, 'Zal');
});

test('parseBrand: noto\'g\'ri tur / qiymat har maydonda alohida standartga tushadi (boshqa maydonlarga ta\'sir qilmaydi)', () => {
  const b = parseBrand({
    name: 123, tagline: { x: 1 }, logo_url: 'javascript:alert(1)', favicon_url: 5, palette: 'neon', primary_color: 'red', font: 'comic',
    hero: 'matn', contact: [], modules: 'yoq', terms: null,
  });
  assert.equal(b.present, true);
  assert.equal(b.name, '');
  assert.equal(b.tagline, '');
  assert.equal(b.logoUrl, null);
  assert.equal(b.faviconUrl, null);
  assert.equal(b.palette, null);
  assert.equal(b.primaryColor, null);
  assert.equal(b.font, null);
  assert.deepEqual(b.hero, { title: '', subtitle: '', ctaText: '' });
  assert.equal(b.contact.phone, '');
  assert.deepEqual(b.modules, DEFAULT_BRAND.modules);
  assert.deepEqual(b.terms, DEFAULT_BRAND.terms);
});

test('cleanText: boshqaruv belgilari olib tashlanadi, uzunlik cheklanadi, ko\'p qatorli faqat so\'ralganda', () => {
  assert.equal(cleanText('  Salom\u0000\u0007   dunyo \n yana ', 80), 'Salom dunyo yana');
  assert.equal(cleanText('a'.repeat(200), 10), 'aaaaaaaaaa');
  assert.equal(cleanText(7, 10), '');
  assert.equal(cleanText('Du-Ju 10:00\r\nSh 12:00\n\n\n\nYak yopiq', 100, true), 'Du-Ju 10:00\nSh 12:00\n\nYak yopiq');
  assert.equal(cleanText('<b>qalin</b>', 50), '<b>qalin</b>'); // HTML'ni React o'zi ekranlaydi: matn sifatida qoladi
});

test('safeImageUrl: faqat o\'z yo\'li yoki http(s); xavfli sxemalar va protokolsiz host rad etiladi', () => {
  assert.equal(safeImageUrl('/media/brand/x.webp'), '/media/brand/x.webp');
  assert.equal(safeImageUrl('https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
  assert.equal(safeImageUrl('http://example.com/a.png'), 'http://example.com/a.png');
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.com/a.png', 'ftp://x/a.png', 'https://user:pw@x.com/a.png', '/a b.png', '/a"onerror=1', "/a'b", 'https://', '', '   ', null, 5, '/x\u0000y']) {
    assert.equal(safeImageUrl(bad), null, String(bad));
  }
  assert.equal(safeImageUrl(`/${'a'.repeat(600)}`), null);
});

test('cleanColor: faqat #RRGGBB', () => {
  assert.equal(cleanColor('#2f4836'), '#2F4836');
  for (const bad of ['2f4836', '#fff', '#12345', 'rgb(1,2,3)', '', null, 7]) assert.equal(cleanColor(bad), null, String(bad));
});

// ─── Bo'limlar ────────────────────────────────────────────────────────────────

test('modules: faqat aniq false yashiradi; "false", 0, null, noma\'lum kalit — yoqiq qoladi', () => {
  const b = parseBrand({ modules: { menu: 'false', ar360: 0, booking: null, tour: false, orders: undefined, waiter_call: false, qaysi: false } });
  assert.deepEqual(b.modules, { menu: true, ar360: true, booking: true, tour: false, orders: true, waiter_call: false });
});

test('moduleEnabledIn: menyu o\'chiq bo\'lsa 360° va buyurtmalar ham mavjud emas; bron va aloqa qoladi', () => {
  const b = parseBrand({ modules: { menu: false } });
  assert.equal(moduleEnabledIn(b, 'menu'), false);
  assert.equal(moduleEnabledIn(b, 'ar360'), false);
  assert.equal(moduleEnabledIn(b, 'orders'), false);
  assert.equal(moduleEnabledIn(b, 'booking'), true);
  assert.equal(moduleEnabledIn(b, 'waiter_call'), true);
  assert.equal(moduleEnabledIn(b, 'tour'), true);
  const c = parseBrand({ modules: { ar360: false } });
  assert.equal(moduleEnabledIn(c, 'ar360'), false);
  assert.equal(moduleEnabledIn(c, 'menu'), true);
  assert.equal(moduleEnabledIn(c, 'orders'), true);
});

// ─── Sessiyadan o'qish ────────────────────────────────────────────────────────

test('getBrand / moduleEnabled / brandName / useBrand: sessiyadan, keshlangan (havola barqaror), sessiya almashsa yangilanadi', () => {
  withSession(undefined, () => {
    assert.equal(getBrand(), DEFAULT_BRAND);
    assert.equal(moduleEnabled('ar360'), true);
    assert.equal(brandName(), 'Guliston');
    assert.equal(brandName('Boshqa'), 'Boshqa');
  });
  const session = { brand: FULL };
  withSession(session, () => {
    const first = getBrand();
    assert.equal(getBrand(), first, 'bir xil sessiya -> bir xil obyekt');
    assert.equal(useBrand(), first);
    assert.equal(brandName('Guliston'), 'Shohjaxon Saroyi');
    assert.equal(moduleEnabled('ar360'), false);
    assert.equal(moduleEnabled('orders'), false);
    assert.equal(moduleEnabled('booking'), true);
    assert.equal(moduleEnabled('tour'), true);
  });
  withSession({ brand: { name: '   ' } }, () => assert.equal(brandName('Sahifa nomi'), 'Sahifa nomi'));
  withSession({ brand: null }, () => assert.equal(getBrand(), DEFAULT_BRAND));
});

// ─── Atamalar ─────────────────────────────────────────────────────────────────

test('term: standart bo\'lsa tarjima qilinadi, maxsus bo\'lsa egasi yozgan matn TARJIMASIZ', () => {
  const ru = (s: string) => ({ Stol: 'Стол', Mehmon: 'Гость', Restoran: 'Ресторан' }[s] ?? s);
  withSession({}, () => {
    assert.equal(term('table'), 'Stol');
    assert.equal(term('table', ru), 'Стол');
    assert.equal(isCustomTerm('table'), false);
  });
  withSession({ brand: { terms: { table: 'STOL', guest: 'Mijoz' } } }, () => {
    // "STOL" harf registri bilan farq qilsa ham standart hisoblanadi (tarjima saqlanadi)
    assert.equal(isCustomTerm('table'), false);
    assert.equal(term('table', ru), 'Стол');
    assert.equal(isCustomTerm('guest'), true);
    assert.equal(term('guest', ru), 'Mijoz');
    assert.equal(term('venue', ru), 'Ресторан');
  });
  assert.deepEqual({ ...DEFAULT_TERMS }, { table: 'Stol', guest: 'Mehmon', venue: 'Restoran' });
});

test('applyTerms: maxsus atama bo\'lmasa matn aynan o\'zgarmaydi', () => {
  withSession({}, () => {
    for (const text of ['Stol #5', 'Stolni tanlang', 'Mehmonlar soni', 'Restoran hozir yopiq', '']) assert.equal(applyTerms(text), text);
  });
  withSession({ brand: { name: 'X' } }, () => assert.equal(applyTerms('Stol #5'), 'Stol #5'));
});

test('applyTerms: o\'zbekcha o\'zak almashadi (qo\'shimchalar saqlanadi), harf registri moslanadi', () => {
  withSession({ brand: { terms: { table: 'Zal' } } }, () => {
    assert.equal(applyTerms('Stol #5'), 'Zal #5');
    assert.equal(applyTerms('Stolni tanlang'), 'Zalni tanlang');
    assert.equal(applyTerms('Stolingiz faol ulangan'), 'Zalingiz faol ulangan');
    assert.equal(applyTerms('stolingizda'), 'zalingizda');
    assert.equal(applyTerms('Bu kuni 3 ta stol bo\'sh'), 'Bu kuni 3 ta zal bo\'sh');
    assert.equal(applyTerms('Restorandagi stollar'), 'Restorandagi zallar');
    assert.equal(applyTerms('Mehmonlar'), 'Mehmonlar', 'mehmon atamasi o\'zgarmagan');
  });
  withSession({ brand: { terms: { table: 'Zal', guest: 'Mijoz', venue: "To'yxona" } } }, () => {
    assert.equal(applyTerms('Restoran hozir yopiq'), "To'yxona hozir yopiq");
    assert.equal(applyTerms('Mehmonlar soni: Stol 7'), 'Mijozlar soni: Zal 7');
  });
});

test('applyTerms: akronim registri saqlanadi, so\'z o\'rtasidagi moslik almashmaydi, maxsus atamadagi standart so\'z qayta almashmaydi', () => {
  withSession({ brand: { terms: { table: 'VIP' } } }, () => {
    assert.equal(applyTerms('Stol #5'), 'VIP #5');
    assert.equal(applyTerms('stolingiz'), 'VIPingiz');
    assert.equal(applyTerms('Ustoz Stol'), 'Ustoz VIP', '"Ustoz" ichidagi "stoz"/"tol" emas: faqat so\'z boshidagi "stol"');
    assert.equal(applyTerms('Pastol'), 'Pastol', 'so\'z o\'rtasida almashmaydi');
  });
  withSession({ brand: { terms: { table: 'Mehmon stoli', guest: 'Mijoz' } } }, () => {
    assert.equal(applyTerms('Stol #1, Mehmonlar'), 'Mehmon stoli #1, Mijozlar', 'bir o\'tishda: yangi atamadagi "Mehmon" qayta almashmaydi');
  });
});

test('applyTerms: rus/ingliz tarjimasidagi standart so\'z ham almashadi (translate orqali), maxsus atama tarjima qilinmaydi', () => {
  const ru = (s: string) => ({ Stol: 'Стол', Mehmon: 'Гость', Restoran: 'Ресторан' }[s] ?? s);
  const en = (s: string) => ({ Stol: 'Table', Mehmon: 'Guest', Restoran: 'Restaurant' }[s] ?? s);
  withSession({ brand: { terms: { table: 'Zal', venue: 'Saroy' } } }, () => {
    assert.equal(applyTerms('Стол #5', ru), 'Zal #5');
    assert.equal(applyTerms('Столы и бронирование', ru), 'Zalы и бронирование');
    assert.equal(applyTerms('Table #5', en), 'Zal #5');
    assert.equal(applyTerms('Restaurant is closed', en), 'Saroy is closed');
    assert.equal(applyTerms('Гость', ru), 'Гость');
  });
});

// ─── Aloqa ────────────────────────────────────────────────────────────────────

test('telHref: raqamlar soni 7-15, 998... boshlansa + qo\'shiladi, harf/belgilar tashlanadi', () => {
  assert.equal(telHref('+998 90 123-45-67'), 'tel:+998901234567');
  assert.equal(telHref('998901234567'), 'tel:+998901234567');
  assert.equal(telHref('(0731) 123-456'), 'tel:0731123456');
  assert.equal(telHref('123'), null);
  assert.equal(telHref('telefon yo\'q'), null);
  assert.equal(telHref('1'.repeat(20)), null);
});

test('socialLink / websiteLink: turli yozuvlar xavfsiz https havolaga; javascript: va noto\'g\'ri qiymat rad etiladi', () => {
  const insta = (v: string) => socialLink(v, 'instagram.com', /^[A-Za-z0-9._]{1,30}$/, ['instagram.com', 'www.instagram.com']);
  assert.deepEqual(insta('@shohjaxon'), { text: '@shohjaxon', href: 'https://instagram.com/shohjaxon' });
  assert.deepEqual(insta('shoh.jaxon_1'), { text: '@shoh.jaxon_1', href: 'https://instagram.com/shoh.jaxon_1' });
  assert.deepEqual(insta('instagram.com/shohjaxon'), { text: '@shohjaxon', href: 'https://instagram.com/shohjaxon' });
  assert.deepEqual(insta('https://www.instagram.com/shohjaxon/'), { text: '@shohjaxon', href: 'https://www.instagram.com/shohjaxon/' });
  for (const bad of ['javascript:alert(1)', 'a b', '@', '', 'x'.repeat(40)]) assert.equal(insta(bad), null, bad);

  const tg = (v: string) => socialLink(v, 't.me', /^[A-Za-z0-9_]{3,32}$/, ['t.me', 'telegram.me', 'www.t.me']);
  assert.deepEqual(tg('@shohjaxon_bot'), { text: '@shohjaxon_bot', href: 'https://t.me/shohjaxon_bot' });
  assert.deepEqual(tg('t.me/shohjaxon'), { text: '@shohjaxon', href: 'https://t.me/shohjaxon' });
  assert.equal(tg('ab'), null);
  assert.equal(tg('data:text/html,<script>'), null);

  assert.deepEqual(websiteLink('shohjaxon.uz'), { text: 'shohjaxon.uz', href: 'https://shohjaxon.uz/' });
  assert.deepEqual(websiteLink('https://www.shohjaxon.uz/zal'), { text: 'shohjaxon.uz/zal', href: 'https://www.shohjaxon.uz/zal' });
  for (const bad of ['javascript:alert(1)', 'ftp://x.uz', 'localhost', 'a b c', '', 'https://u:p@x.uz']) assert.equal(websiteLink(bad), null, bad);
});

test('contactItems: faqat to\'ldirilgan va yaroqli maydonlar, tartib saqlanadi, telefon tel:, tashqi havolalar https', () => {
  assert.deepEqual(contactItems(DEFAULT_BRAND.contact), []);
  const items = contactItems(parseBrand(FULL).contact);
  assert.deepEqual(items.map((i) => i.kind), ['phone', 'address', 'hours', 'instagram', 'telegram', 'website']);
  assert.equal(items[0].href, 'tel:+998901234567');
  assert.equal(items[1].href, null);
  assert.equal(items[3].href, 'https://instagram.com/shohjaxon');
  assert.equal(items[4].href, 'https://t.me/shohjaxon');
  assert.equal(items[5].href, 'https://shohjaxon.uz/');
  for (const i of items) assert.ok(i.href === null || /^(tel:|https:\/\/)/.test(i.href), i.kind);

  const odd = contactItems(parseBrand({ contact: { phone: 'tel yo\'q', phone2: '+998711234567', instagram: 'javascript:alert(1)', telegram: '', website: 'javascript:alert(1)', address: '' } }).contact);
  assert.deepEqual(odd.map((i) => i.kind), ['phone', 'phone2']);
  assert.equal(odd[0].href, null, 'havolaga aylanmaydigan telefon oddiy matn bo\'ladi');
  assert.equal(odd[1].href, 'tel:+998711234567');
});

// ─── DOM: sarlavha, favicon, shrift ───────────────────────────────────────────

test('applyBrand: brend bor — sarlavha, favicon, data-font; mavjud favicon havolalari yangilanadi', () => {
  const doc = fakeDoc(['/favicon.svg']);
  g.window = { __GULISTON_SESSION__: { brand: FULL } };
  g.document = doc;
  try {
    applyBrand();
  } finally {
    delete g.window;
    delete g.document;
  }
  assert.equal(doc.title, 'Shohjaxon Saroyi');
  assert.equal(doc.documentElement.dataset.font, 'sans');
  assert.equal(doc.links.length, 1);
  assert.equal(doc.links[0].href, '/media/brand/shop_3/fav.png');
  assert.equal(doc.links[0].type, undefined, 'eski type="image/svg+xml" olib tashlanadi');
});

test('applyBrand: favicon havolasi yo\'q bo\'lsa yangisi qo\'shiladi; nom/favicon/shrift berilmasa mavjud qiymatga tegilmaydi', () => {
  const doc = fakeDoc();
  g.window = { __GULISTON_SESSION__: { brand: { name: 'Kafe', favicon_url: '/m/f.ico' } } };
  g.document = doc;
  try {
    applyBrand();
  } finally {
    delete g.window;
    delete g.document;
  }
  assert.equal(doc.title, 'Kafe');
  assert.equal(doc.links.length, 1);
  assert.equal(doc.links[0].href, '/m/f.ico');
  assert.equal(doc.documentElement.dataset.font, undefined);

  withSession({ brand: { tagline: 'faqat shior' } }, (d) => {
    d.documentElement.dataset.font = 'serif';
    applyBrand();
    assert.equal(d.title, 'Eski sarlavha');
    assert.equal(d.documentElement.dataset.font, 'serif', 'brend shrift bermasa server yozgan atribut o\'zgarmaydi');
    assert.equal(d.links.length, 0);
  });
});

test('applyBrand: brend yo\'q bo\'lsa DOM\'ga umuman tegmaydi', () => {
  withSession({}, (doc) => {
    applyBrand();
    assert.equal(doc.title, 'Eski sarlavha');
    assert.deepEqual(doc.documentElement.dataset, {});
    assert.equal(doc.links.length, 0);
  });
});

// ─── Palitra: custom ──────────────────────────────────────────────────────────

test('palitra: brand.palette (classic|orange|custom) eski palette kalitidan ustun; custom ustidan classic yozilib ketmaydi', () => {
  assert.equal(parseGuestPalette('custom'), 'custom');
  assert.equal(parseGuestPalette('classic'), 'classic');
  withSession({ brand: { palette: 'custom' } }, (doc) => {
    assert.equal(getGuestPalette(), 'custom');
    assert.equal(applyGuestPalette(), 'custom');
    assert.equal(doc.documentElement.dataset.palette, 'custom');
    assert.equal(currentPalette(), 'custom');
  });
  withSession({ palette: 'orange', brand: { palette: 'classic' } }, () => assert.equal(getGuestPalette(), 'classic'));
  withSession({ palette: 'orange', brand: { name: 'Nom' } }, () => assert.equal(getGuestPalette(), 'orange'));
  withSession({ brand: { palette: 'neon' } }, () => assert.equal(getGuestPalette(), 'classic'));
  withSession({}, () => assert.equal(getGuestPalette(), 'classic'));
});

test('chromeColors: custom — server tokenlaridan (--bg-surface, --bg-primary) o\'qiladi; o\'qib bo\'lmasa zaxira; boshqa palitralar jadvaldan', () => {
  assert.deepEqual(chromeColors('classic', 'light'), { header: '#FFFFFF', background: '#F7F3EA' });
  assert.deepEqual(chromeColors('orange', 'dark'), { header: '#1B1714', background: '#141110' });
  withSession({ brand: { palette: 'custom' } }, () => {
    g.getComputedStyle = () => ({ getPropertyValue: (name: string) => (name === '--bg-surface' ? ' #112233 ' : name === '--bg-primary' ? '#445566' : '') });
    try {
      assert.deepEqual(chromeColors('custom', 'light'), { header: '#112233', background: '#445566' });
      g.getComputedStyle = () => ({ getPropertyValue: () => 'rgb(1, 2, 3)' });
      assert.deepEqual(chromeColors('custom', 'dark'), { header: '#17201A', background: '#0F1511' }, 'zaxira = klassik tun neytrali');
      g.getComputedStyle = () => { throw new Error('yo\'q'); };
      assert.deepEqual(chromeColors('custom', 'light'), { header: '#FFFFFF', background: '#F7F3EA' }, 'zaxira = klassik kun neytrali');
    } finally {
      delete g.getComputedStyle;
    }
  });
});

test('fasl rangi: brend rangi (custom palitra) ustun — data-season qo\'yilmaydi; boshqa palitrada avvalgidek', () => {
  withSession({ season: 'kuz', brand: { palette: 'custom' } }, (doc) => {
    doc.documentElement.dataset.season = 'qish';
    assert.equal(applyGuestSeason(), null);
    assert.equal(doc.documentElement.dataset.season, undefined);
  });
  withSession({ season: 'kuz' }, (doc) => {
    assert.equal(applyGuestSeason(), 'kuz');
    assert.equal(doc.documentElement.dataset.season, 'kuz');
  });
  withSession({ season: 'yoz', palette: 'orange' }, () => assert.equal(applyGuestSeason(), 'yoz'));
});

// ─── CSS shartnomasi: classic qoidalari custom'ga tegmaydi, data-font, tun ────

const STYLES = path.resolve(import.meta.dirname, '../src/styles');

/** CSS'dagi (izohsiz) qoidalar selektorlari ro'yxati: har qoida uchun vergul bilan ajratilgan selektorlar. */
function selectorsOf(file: string): string[][] {
  const css = fs.readFileSync(path.join(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter((sel) => !sel.startsWith('@'));
  return rules.map((rule) => rule.split(/,(?![^(]*\))/).map((s) => s.replace(/\s+/g, ' ').trim()));
}

test('palette.css: har selektor klassik / data-font / custom bo\'limiga tegishli; classic va custom hech qachon bir selektorda emas', () => {
  const rules = selectorsOf('palette.css');
  assert.ok(rules.length > 40);
  for (const group of rules) {
    for (const sel of group) {
      const classic = sel.includes("[data-palette='classic']");
      const font = sel.startsWith("html[data-font='");
      const custom = sel.startsWith("html[data-palette='custom']") || sel.startsWith(":root:where([data-palette='custom'])");
      assert.ok(classic || font || custom, `palette.css: ruxsat etilmagan selektor: ${sel}`);
      assert.ok(!(classic && custom), `classic va custom aralashgan: ${sel}`);
      if (classic) assert.ok(sel.startsWith('html['), `klassik qoida html[...] bilan boshlanishi shart: ${sel}`);
    }
  }
});

test('palette.css: data-font uch qiymat uchun sarlavha shrifti qoidalari bor, har biri o\'z shriftida', () => {
  const css = fs.readFileSync(path.join(STYLES, 'palette.css'), 'utf8');
  const block = (value: string) => {
    const m = css.match(new RegExp(`html\\[data-font='${value}'\\](?::not\\(\\[data-palette='orange'\\]\\))? :is\\([^{]*\\)\\s*\\{([^}]*)\\}`));
    assert.ok(m, `data-font='${value}' qoidasi yo'q`);
    return m![1];
  };
  assert.match(block('serif'), /Playfair Display/);
  assert.match(block('sans'), /Plus Jakarta Sans/);
  assert.match(block('rounded'), /Outfit/);
  // Klassik (data-font'siz) serif qoidasi saqlangan: orqaga mos
  assert.match(css, /html\[data-palette='classic'\] :is\(h1, h2[^{]*\{\s*font-family: 'Playfair Display'/);
  // Selektor ro'yxatlari bir xil (ustuvorlik teng) — klassik va uchala data-font
  const lists = [...css.matchAll(/(html\[data-(?:palette='classic'|font='(?:serif|sans|rounded)')\](?::not\(\[data-palette='orange'\]\))?) :is\(([^{]*)\)\s*\{/g)].map((m) => m[2].replace(/\s+/g, ' ').trim()).filter((list) => list.startsWith('h1, h2'));
  assert.equal(lists.length, 4);
  assert.equal(new Set(lists).size, 1, 'sarlavha selektor ro\'yxati to\'rt qoidada bir xil bo\'lishi kerak');
  assert.ok(css.indexOf("html[data-font='serif']:not([data-palette='orange']) :is(") > css.indexOf("html[data-palette='classic'] :is("), 'data-font qoidalari klassikdan KEYIN (teng ustuvorlikda g\'olib)');
  // Apelsin palitrada serif qo'llanmaydi (server data-font'ni doim yozadi: standart serif mavjud apelsin ko'rinishini buzmasin), sans/rounded esa qo'llanadi
  assert.doesNotMatch(css, /html\[data-font='serif'\] /);
  assert.match(css, /html\[data-font='sans'\] :is\(/);
  assert.match(css, /html\[data-font='rounded'\] :is\(/);
});

test('darkTheme.css: apelsin tun bloklari custom\'ni olmaydi (server tun tokenlari tartibga bog\'liq bo\'lmay g\'olib); --dk-* uchun nol ustuvorlikli zaxira bor', () => {
  const rules = selectorsOf('darkTheme.css');
  const orangeBlocks = rules.filter((g2) => g2.length === 1 && g2[0].startsWith("html[data-theme='dark']:not([data-palette='classic']"));
  assert.equal(orangeBlocks.length, 2);
  for (const [sel] of orangeBlocks) assert.ok(sel.includes("[data-palette='custom']"), `custom chiqarilmagan: ${sel}`);
  // Ruxsat etilmagan: yalang'och `:not([data-palette='classic'])` (custom'ni ham olib qo'yardi)
  for (const group of rules) for (const sel of group) assert.ok(!/:not\(\[data-palette='classic'\]\)/.test(sel), `custom'ni olib qoladigan selektor: ${sel}`);
  assert.ok(rules.some((gr) => gr.some((sel) => sel.startsWith(":root:where([data-theme='dark'][data-palette='custom'])"))), 'neytral tun tokenlari bloki yo\'q');
  // Brend rangidagi matn ro'yxati (klassik/fasl) custom'ni ham qamraydi
  const withClassic = rules.flat().filter((sel) => sel.includes(":is([data-season], [data-palette='classic']"));
  assert.ok(withClassic.length > 50);
  for (const sel of withClassic) assert.ok(sel.includes("[data-palette='custom']"), sel);
});

test('i18n: yangi brend kalitlari ru va en lug\'atlarida mavjud', async () => {
  for (const lang of ['ru', 'en']) {
    const mod = await import(path.resolve(import.meta.dirname, `../src/i18n/${lang}/brand.ts`));
    const dict = mod.default as Record<string, string>;
    for (const key of ['Mehmon', 'Restoran', 'Kafe', "To'yxona", 'Zal/Stol', "Bu bo'lim hozircha mavjud emas", 'Aloqa', 'Manzil', 'Ish vaqti', "Qo'ng'iroq qilish: {phone}"]) {
      assert.ok(dict[key]?.trim(), `${lang}: ${key}`);
    }
  }
});

// ─── Bosh sahifa matni: hero_i18n (standart matn tarjimasi, egasi yozgani tarjimasiz) ───

test('hero_i18n: parseBrand tarjimalarni tozalab oladi; yo\'q / noto\'g\'ri tur / noma\'lum til — bo\'sh', () => {
  assert.deepEqual(DEFAULT_BRAND.heroI18n, { ru: { title: '', subtitle: '' }, en: { title: '', subtitle: '' } });
  assert.deepEqual(parseBrand({ hero: { title: 'A' } }).heroI18n, DEFAULT_BRAND.heroI18n);
  for (const bad of ['x', 5, null, [], [1]]) assert.deepEqual(parseBrand({ hero_i18n: bad }).heroI18n, DEFAULT_BRAND.heroI18n, String(bad));
  const b = parseBrand({
    hero_i18n: { ru: { title: '  Кофе,   десерты \u0007 ', subtitle: 9 }, en: 'matn', de: { title: 'Kaffee' } },
  });
  assert.deepEqual(b.heroI18n.ru, { title: 'Кофе, десерты', subtitle: '' });
  assert.deepEqual(b.heroI18n.en, { title: '', subtitle: '' });
  assert.equal(parseBrand({ hero_i18n: { en: { title: 'x'.repeat(500) } } }).heroI18n.en.title.length, 160);
});

test('heroTextFor: standart matn ru/en da tarjima bilan; egasi yozgan matn doim o\'zbekcha; matn yo\'q bo\'lsa bo\'sh', () => {
  const preset = parseBrand({
    hero: { title: 'Qahva, shirinlik va iliq muhit', subtitle: "Menyuni 360° ko'rinishda aylantirib ko'ring." },
    hero_i18n: {
      ru: { title: 'Кофе, десерты и уютная атмосфера', subtitle: 'Листайте меню в 360°.' },
      en: { title: 'Coffee, desserts and a cozy atmosphere', subtitle: 'Browse the menu in 360°.' },
    },
  });
  assert.equal(heroTextFor(preset, 'title', 'uz'), 'Qahva, shirinlik va iliq muhit');
  assert.equal(heroTextFor(preset, 'title', 'ru'), 'Кофе, десерты и уютная атмосфера');
  assert.equal(heroTextFor(preset, 'subtitle', 'en'), 'Browse the menu in 360°.');

  // Sarlavhani egasi yozgan (server hero_i18n da faqat subtitle beradi): sarlavha hamma tilda o'zbekcha, matn esa tarjima qilinadi
  const mixed = parseBrand({
    hero: { title: 'Shohjaxon saroyi — sizning bayramingiz', subtitle: "Zal va stollarni oldindan ko'ring." },
    hero_i18n: { ru: { subtitle: 'Осмотрите зал и столы заранее.' }, en: { subtitle: 'Preview the hall and tables.' } },
  });
  assert.equal(heroTextFor(mixed, 'title', 'ru'), 'Shohjaxon saroyi — sizning bayramingiz');
  assert.equal(heroTextFor(mixed, 'title', 'en'), 'Shohjaxon saroyi — sizning bayramingiz');
  assert.equal(heroTextFor(mixed, 'subtitle', 'ru'), 'Осмотрите зал и столы заранее.');
  assert.equal(heroTextFor(mixed, 'subtitle', 'uz'), "Zal va stollarni oldindan ko'ring.");

  // hero_i18n umuman yo'q (restoran shabloni yoki egasi ikkala matnni yozgan): hamma til — o'zbekcha
  const owner = parseBrand({ hero: { title: 'Bizning oshxona', subtitle: "Mazali taomlar" } });
  for (const lang of ['uz', 'ru', 'en'] as const) {
    assert.equal(heroTextFor(owner, 'title', lang), 'Bizning oshxona');
    assert.equal(heroTextFor(owner, 'subtitle', lang), 'Mazali taomlar');
  }

  // Matn yo'q (restoran: hero bo'sh) -> '' (sahifa o'zining tarjima qilingan standartini ko'rsatadi); tarjima ham bo'lsa-yu matn bo'lmasa — aralashtirilmaydi
  for (const lang of ['uz', 'ru', 'en'] as const) {
    assert.equal(heroTextFor(DEFAULT_BRAND, 'title', lang), '');
    assert.equal(heroTextFor(parseBrand({ hero: {}, hero_i18n: { ru: { title: 'Лишнее' } } }), 'title', lang), '');
  }
});

// ─── Shablon atamalari (Kafe, To'yxona, Zal/Stol): standart bo'lsa tarjima, egasi yozgani tarjimasiz ───

test('PRESET_TERMS: backend BUSINESS_PRESETS atamalari; parseBrand ularni asl yozuviga keltiradi, boshqa matn o\'z holicha', () => {
  assert.deepEqual({ ...PRESET_TERMS }, { table: ['Stol', 'Zal/Stol'], guest: ['Mehmon'], venue: ['Restoran', 'Kafe', "To'yxona"] });
  const b = parseBrand({ terms: { table: 'zal/STOL', guest: 'MEHMON', venue: "to'yxona" } });
  assert.deepEqual(b.terms, { table: 'Zal/Stol', guest: 'Mehmon', venue: "To'yxona" });
  assert.deepEqual(parseBrand({ terms: { table: 'Zal', guest: 'Mijoz', venue: 'Bizning kafe' } }).terms, { table: 'Zal', guest: 'Mijoz', venue: 'Bizning kafe' });
});

const RU_TERMS: Record<string, string> = { Stol: 'Стол', 'Zal/Stol': 'Зал/Стол', Mehmon: 'Гость', Restoran: 'Ресторан', Kafe: 'Кафе', "To'yxona": 'Банкетный зал' };
const EN_TERMS: Record<string, string> = { Stol: 'Table', 'Zal/Stol': 'Hall/Table', Mehmon: 'Guest', Restoran: 'Restaurant', Kafe: 'Cafe', "To'yxona": 'Banquet hall' };
const ruT = (s: string) => RU_TERMS[s] ?? s;
const enT = (s: string) => EN_TERMS[s] ?? s;

test('term: kafe / to\'yxona shablon atamalari ru va en da tarjima qilinadi; egasi yozgan atama (Zal, Bizning kafe, Mijoz) tarjimasiz', () => {
  withSession({ brand: { terms: { table: 'Stol', guest: 'Mehmon', venue: 'Kafe' } } }, () => {
    assert.equal(isPresetTerm('venue'), true);
    assert.equal(isCustomTerm('venue'), true, 'Restoran emas: bosh sahifa "<Nom> Restorani" demaydi');
    assert.equal(term('venue'), 'Kafe');
    assert.equal(term('venue', ruT), 'Кафе');
    assert.equal(term('venue', enT), 'Cafe');
    assert.equal(term('table', ruT), 'Стол');
  });
  withSession({ brand: { terms: { table: 'Zal/Stol', venue: "To'yxona" } } }, () => {
    assert.equal(term('table', ruT), 'Зал/Стол');
    assert.equal(term('table', enT), 'Hall/Table');
    assert.equal(term('venue', ruT), 'Банкетный зал');
    assert.equal(term('venue', enT), 'Banquet hall');
    assert.equal(term('venue'), "To'yxona", 'uz: tarjimasiz o\'zining matni');
  });
  withSession({ brand: { terms: { table: 'Zal', guest: 'Mijoz', venue: 'Bizning kafe' } } }, () => {
    for (const key of ['table', 'guest', 'venue'] as const) {
      assert.equal(isPresetTerm(key), false, key);
      assert.equal(isCustomTerm(key), true, key);
    }
    assert.equal(term('table', ruT), 'Zal');
    assert.equal(term('guest', enT), 'Mijoz');
    assert.equal(term('venue', ruT), 'Bizning kafe');
  });
  // Brend yo'q: avvalgidek
  withSession({}, () => {
    assert.equal(term('venue', ruT), 'Ресторан');
    assert.equal(isPresetTerm('venue'), true);
    assert.equal(isCustomTerm('venue'), false);
  });
});

test('applyTerms: shablon atamasi matn tilida almashadi (Кафе / Cafe / Banquet hall), egasi yozgani o\'zi; uz da o\'zbekcha', () => {
  withSession({ brand: { terms: { venue: 'Kafe' } } }, () => {
    assert.equal(applyTerms('Restoran hozir yopiq'), 'Kafe hozir yopiq');
    assert.equal(applyTerms('Ресторан подтвердит бронь', ruT), 'Кафе подтвердит бронь');
    assert.equal(applyTerms('The restaurant will confirm your booking', enT), 'The cafe will confirm your booking');
  });
  withSession({ brand: { terms: { venue: "To'yxona", table: 'Zal/Stol' } } }, () => {
    assert.equal(applyTerms('The restaurant will confirm', enT), 'The banquet hall will confirm');
    assert.equal(applyTerms('Ресторан подтвердит бронь', ruT), 'Банкетный зал подтвердит бронь');
    assert.equal(applyTerms('Стол #5', ruT), 'Зал/Стол #5');
    assert.equal(applyTerms('Table #5', enT), 'Hall/Table #5');
    assert.equal(applyTerms('Stol #5'), 'Zal/Stol #5');
    assert.equal(applyTerms('Stolni tanlang'), 'Zal/Stolni tanlang');
  });
  withSession({ brand: { terms: { table: 'Zal' } } }, () => {
    assert.equal(applyTerms('Стол #5', ruT), 'Zal #5', 'egasi yozgan "Zal" tarjima qilinmaydi (shablon atamasi emas)');
    assert.equal(applyTerms('Table #5', enT), 'Zal #5');
  });
});

// ─── Custom palitra: neytral tokenlar klassikniki; server brend tokenlari ustuvorligi ───

type Declarations = Record<string, string>;

/** CSS (izohsiz) -> qoidalar: vergul bilan ajratilgan selektorlar, tana va fayldagi tartib. */
function parseRules(css: string): { selectors: string[]; body: string; order: number }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => !m[1].trim().startsWith('@'))
    .map((m, order) => ({ selectors: m[1].split(/,(?![^(]*\))/).map((x) => x.replace(/\s+/g, ' ').trim()), body: m[2], order }));
}

function declarationsIn(body: string): Declarations {
  const out: Declarations = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);?/gi)) out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  return out;
}

const readCss = (file: string) => fs.readFileSync(path.join(STYLES, file), 'utf8');

/** Aynan shu bitta selektorli qoidaning e'lonlari (bo'lmasa test yiqiladi). */
function blockOf(file: string, selector: string): Declarations {
  const rule = parseRules(readCss(file)).find((r) => r.selectors.length === 1 && r.selectors[0] === selector);
  assert.ok(rule, `${file}: «${selector}» qoidasi yo'q`);
  return declarationsIn(rule!.body);
}

const NEUTRAL_LIGHT = [
  '--bg-primary', '--bg-surface', '--bg-surface-subtle', '--bg-surface-dark', '--border-subtle', '--border-strong',
  '--text-primary', '--text-secondary', '--text-muted', '--text-inverse', '--status-success', '--status-success-light', '--status-danger',
  '--shadow-tint-rgb', '--shadow-sm', '--shadow-card', '--shadow-hover', '--shadow-modal',
];
const NEUTRAL_DARK = [
  '--bg-primary', '--bg-surface', '--bg-surface-subtle', '--bg-surface-dark', '--border-subtle', '--border-strong',
  '--text-primary', '--text-secondary', '--text-muted', '--status-success-light', '--dk-hover', '--dk-surface-rgb', '--dk-bg-rgb', '--dk-ink-rgb',
];

test('custom palitra neytrallari klassik (krem / yashil-qora) bilan AYNAN bir xil: kun va tun; brend tokenlari yo\'q', () => {
  const classicLight = blockOf('palette.css', "html[data-palette='classic']");
  const customLight = blockOf('palette.css', ":root:where([data-palette='custom'])");
  for (const token of NEUTRAL_LIGHT) {
    assert.ok(classicLight[token], `klassik kun: ${token}`);
    assert.equal(customLight[token], classicLight[token], `custom kun: ${token}`);
  }
  const classicDark = blockOf('palette.css', "html[data-theme='dark'][data-palette='classic']");
  const customDark = blockOf('darkTheme.css', ":root:where([data-theme='dark'][data-palette='custom'])");
  for (const token of NEUTRAL_DARK) {
    assert.ok(classicDark[token], `klassik tun: ${token}`);
    assert.equal(customDark[token], classicDark[token], `custom tun: ${token}`);
  }
  // Brend tokenlarini faqat server beradi: kun blokida umuman yo'q, tun blokida faqat server bermasa zaxira
  assert.deepEqual(Object.keys(customLight).filter((k) => /^--(brand-|dk-|primary-green|accent-)/.test(k)), []);
  assert.deepEqual(Object.keys(customDark).filter((k) => /^--(brand-|primary-green|accent-)/.test(k)), []);
  assert.deepEqual(Object.keys(customDark).filter((k) => k.startsWith('--dk-') && !NEUTRAL_DARK.includes(k)).sort(), ['--dk-accent-text', '--dk-brand-text']);
});

test('custom palitra neytrallari serverning kontrast hisobidagi fonlar bilan mos (brand_color.py: CREAM / DARK_BG / DARK_SURFACE / DARK_SUBTLE / DARK_HOVER)', () => {
  const light = blockOf('palette.css', ":root:where([data-palette='custom'])");
  const dark = blockOf('darkTheme.css', ":root:where([data-theme='dark'][data-palette='custom'])");
  assert.equal(light['--bg-primary'], '#F7F3EA');
  assert.equal(light['--bg-surface'], '#FFFFFF');
  assert.equal(dark['--bg-primary'], '#0F1511');
  assert.equal(dark['--bg-surface'], '#17201A');
  assert.equal(dark['--bg-surface-subtle'], '#1F2A22');
  assert.equal(dark['--dk-hover'], '#26342B');
});

// Soddalashtirilgan CSS selektor moslagich: faqat `html` / `:root` ildiz selektorlari (kombinatorsiz): teg, atribut, :not/:is/:where, :root.
type Spec = [number, number, number];
type Compound = { tag: boolean; root: boolean; attrs: { name: string; value: string | null }[]; fns: { kind: string; list: Compound[] }[] };

function splitTop(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '(' || source[i] === '[') depth += 1;
    else if (source[i] === ')' || source[i] === ']') depth -= 1;
    else if (source[i] === ',' && depth === 0) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts.map((p) => p.trim());
}

/** null — ildiz selektori emas (kombinator, sinf, ...): tokenni `html` darajasida o'zgartira olmaydi. */
function parseCompound(source: string): Compound | null {
  const c: Compound = { tag: false, root: false, attrs: [], fns: [] };
  let rest = source.trim();
  while (rest) {
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^html(?![\w-])/))) c.tag = true;
    else if ((m = rest.match(/^:root(?![\w-])/))) c.root = true;
    else if ((m = rest.match(/^\[([\w-]+)(?:=(?:'([^']*)'|"([^"]*)"))?\]/))) c.attrs.push({ name: m[1], value: m[2] ?? m[3] ?? null });
    else if ((m = rest.match(/^:(not|is|where)\(/))) {
      let depth = 1;
      let end = m[0].length;
      while (end < rest.length && depth > 0) {
        if (rest[end] === '(') depth += 1;
        else if (rest[end] === ')') depth -= 1;
        end += 1;
      }
      const inner = splitTop(rest.slice(m[0].length, end - 1)).map(parseCompound);
      if (inner.some((x) => x === null)) return null;
      c.fns.push({ kind: m[1], list: inner as Compound[] });
      m = [rest.slice(0, end)] as unknown as RegExpMatchArray;
    } else return null;
    rest = rest.slice(m[0].length);
  }
  return c;
}

const specOf = (c: Compound): Spec => {
  const total: Spec = [0, c.attrs.length + (c.root ? 1 : 0), c.tag ? 1 : 0];
  for (const fn of c.fns) {
    if (fn.kind === 'where') continue;
    const best = fn.list.map(specOf).sort(cmpSpec).pop() ?? [0, 0, 0];
    total[0] += best[0]; total[1] += best[1]; total[2] += best[2];
  }
  return total;
};
const cmpSpec = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

type State = Record<string, string>;
const matches = (c: Compound, state: State): boolean =>
  c.attrs.every((a) => (a.value === null ? a.name in state : state[a.name] === a.value)) &&
  c.fns.every((fn) => (fn.kind === 'not' ? !fn.list.some((x) => matches(x, state)) : fn.list.some((x) => matches(x, state))));

// Serverning `<style id="brand-vars">` bloklari (backend/shops/brand_color.py: light_guest / dark_guest) — mehmon doirasi
const SERVER_LIGHT = [
  '--brand-primary', '--brand-primary-hover', '--brand-primary-light', '--brand-primary-subtle', '--brand-tint-2', '--brand-tint-3', '--brand-warm',
  '--brand-deep', '--brand-primary-rgb', '--brand-accent', '--brand-accent-light', '--brand-accent-subtle',
  '--primary-green', '--primary-green-hover', '--primary-green-light', '--accent-terracotta', '--accent-gold',
];
const SERVER_DARK = [
  '--brand-primary', '--brand-primary-hover', '--brand-primary-light', '--brand-primary-subtle', '--brand-tint-2', '--brand-tint-3', '--brand-warm',
  '--brand-deep', '--brand-primary-rgb', '--brand-accent-light', '--brand-accent-subtle', '--dk-brand-text', '--dk-accent-text',
  '--primary-green', '--primary-green-hover', '--primary-green-light', '--accent-terracotta', '--accent-gold',
];
const SERVER_LIGHT_SPEC: Spec = [0, 1, 1]; // html[data-palette='custom']
const SERVER_DARK_SPEC: Spec = [0, 2, 1]; // html[data-palette='custom'][data-theme='dark']

/**
 * `custom` palitrada (fasl yo'q — JS qo'ymaydi) har bir holatda (kun/tun x dizayn) serverning brend tokenini bosib o'tadigan statik qoidalar:
 * ustuvorligi serverniki bilan teng yoki yuqori (teng bo'lsa tartib hal qiladi — Vite dev rejimida server bloki OLDIN turib qolishi mumkin).
 */
function overridesOfServer(rules: { selectors: string[]; body: string }[]): string[] {
  const found: string[] = [];
  for (const theme of ['light', 'dark']) {
    for (const design of ['new', 'classic']) {
      const state: State = { 'data-palette': 'custom', 'data-theme': theme, 'data-design': design, 'data-font': 'serif' };
      const server = new Map<string, Spec>();
      for (const token of SERVER_LIGHT) server.set(token, SERVER_LIGHT_SPEC);
      if (theme === 'dark') for (const token of SERVER_DARK) server.set(token, SERVER_DARK_SPEC);
      for (const rule of rules) {
        const set = declarationsIn(rule.body);
        for (const selector of rule.selectors) {
          const compound = parseCompound(selector);
          if (!compound || !matches(compound, state)) continue;
          for (const token of Object.keys(set)) {
            const serverSpec = server.get(token);
            if (serverSpec && cmpSpec(specOf(compound), serverSpec) >= 0) found.push(`${theme}/${design}: ${selector} -> ${token}`);
          }
        }
      }
    }
  }
  return found;
}

test('CSS ustuvorligi: custom palitrada statik qoidalar server brend tokenlarini (kun (0,1,1), tun (0,2,1)) hech qachon bosmaydi', () => {
  const all = ['../index.css', 'seasons.css', 'palette.css', 'darkTheme.css', 'designNew.css', 'welcomeNew.css', 'motion.css'].flatMap((file) =>
    parseRules(fs.readFileSync(path.resolve(STYLES, file), 'utf8')),
  );
  assert.ok(all.length > 200);
  assert.deepEqual(overridesOfServer(all), []);

  // Tekshiruv o'zi ishlaydi: ustuvorligi yuqori / teng sinov qoidalari ushlanadi, past ustuvorlik va boshqa palitra qoidalari ushlanmaydi
  const probe = (css: string) => overridesOfServer(parseRules(css));
  assert.equal(probe("html[data-palette='custom'][data-theme='dark'][data-design='new'] { --brand-primary: #123456; }").length, 1, '(0,3,1) dark');
  assert.equal(probe("html[data-theme='dark'][data-palette='custom'] { --dk-brand-text: #fff; }").length, 2, 'teng (0,2,1): ikki dizaynda');
  assert.equal(probe("html[data-palette='custom'] { --brand-warm: #fff; }").length, 2, 'kun (0,1,1) teng: ikki dizaynda; tunda (0,1,1) < (0,2,1) ushlanmaydi');
  assert.equal(probe(":root:where([data-palette='custom']) { --brand-primary: #fff; }").length, 0, ':where = (0,1,0) past');
  assert.equal(probe("html[data-palette='classic'] { --brand-primary: #2F4836; }").length, 0, 'boshqa palitra');
  assert.equal(probe("html[data-theme='dark']:not([data-palette='classic'], [data-palette='custom']) { --brand-deep: #FDBA74; }").length, 0, 'apelsin tun bloki custom\'ni olmaydi');
  assert.equal(probe("html[data-theme='dark']:not([data-palette='classic']) { --brand-deep: #FDBA74; }").length, 2, 'yalang\'och :not(classic) custom\'ni ham oladi');
  assert.equal(probe("html[data-theme='dark'][data-season] { --dk-brand-text: #fff; }").length, 0, 'fasl yo\'q holatda moslashmaydi');
});

test('selektor ustuvorligi hisobi: :not/:is — eng kuchli argument, :where — nol', () => {
  const spec = (s: string) => specOf(parseCompound(s)!);
  assert.deepEqual(spec("html[data-palette='custom']"), [0, 1, 1]);
  assert.deepEqual(spec("html[data-palette='custom'][data-theme='dark']"), [0, 2, 1]);
  assert.deepEqual(spec("html[data-theme='dark']:not([data-palette='classic'], [data-palette='custom'])"), [0, 2, 1]);
  assert.deepEqual(spec(":root:where([data-theme='dark'][data-palette='custom'])"), [0, 1, 0]);
  assert.deepEqual(spec("html[data-theme='dark']:is([data-season], [data-palette='classic'])"), [0, 2, 1]);
  assert.equal(parseCompound('html .wn-root'), null);
  assert.equal(parseCompound('.x'), null);
});

// ─── Modul o'chiq bo'lsa: yo'llar va kirish nuqtalari ─────────────────────────

const SRC_DIR = path.resolve(import.meta.dirname, '../src');
const readSrc = (file: string) => fs.readFileSync(path.join(SRC_DIR, file), 'utf8');

test('App.tsx: har bir modul yo\'li o\'z bo\'limi bilan to\'siladi (ModuleUnavailable); sayr va bron yo\'llari App regexlariga mos keladi', () => {
  const app = readSrc('App.tsx');
  for (const gate of ["gated('booking', <BookingPage />)", "gated('tour', <TourPage />)", "gated('ar360', <ARMenuPage />)", "gated('orders', <OrdersPage />)", "gated('menu', <CheckoutPage />)", "gated('menu', <CartPage />)", "gated('menu', <MenuPage />)"]) {
    assert.ok(app.includes(gate), `App.tsx: ${gate}`);
  }
  const tourRe = /^\/tour(\/|$)/;
  const bookRe = /^\/book(\/|$)/;
  assert.ok(app.includes(String(tourRe)) && app.includes(String(bookRe)), 'App.tsx regexlari testdagi bilan bir xil');
  assert.ok(tourRe.test(TOUR_PATH) && bookRe.test(BOOKING_BASE_PATH));
  assert.ok(app.includes(".split('?')[0].split('#')[0])"), 'App.tsx: so\'rov va # kesib tashlanadi');
  // Sayr va bron ikki alohida bo'lim: bitta marshrutda ikkalasi ham to'silmaydi
  assert.ok(app.indexOf("gated('booking'") !== app.indexOf("gated('tour'"));
});

test('Kirish nuqtalari: ofitsiant chaqirish, bron, sayr, 360°, buyurtmalar tugmalari bo\'lim o\'chiq bo\'lsa chizilmaydi', () => {
  assert.ok(readSrc('components/ui/CallWaiterModal/CallWaiterModal.tsx').includes("!moduleEnabled('waiter_call')"));
  const header = readSrc('components/ui/HeaderNav/HeaderNav.tsx');
  for (const key of ['menu', 'orders', 'waiter_call', 'ar360']) assert.ok(header.includes(`moduleEnabled('${key}')`), `HeaderNav: ${key}`);
  const bottom = readSrc('components/ui/BottomNav/BottomNav.tsx');
  for (const key of ['menu', 'ar360', 'orders']) assert.ok(bottom.includes(`moduleEnabled('${key}')`), `BottomNav: ${key}`);
  // Kirish tugmalari serverdan ham so'raydigan hooklar orqali; hook bo'lim o'chiq bo'lsa so'rov yubormaydi va false qaytaradi
  assert.ok(readSrc('pages/BookingPage/useBooking.ts').includes("if (!moduleEnabled('booking')) return undefined"));
  assert.ok(readSrc('pages/TourPage/useTour.ts').includes("if (!moduleEnabled('tour')) return undefined"));
  for (const file of ['pages/WelcomePage/WelcomePage.tsx', 'pages/WelcomePage/WelcomePageNew.tsx']) {
    const src = readSrc(file);
    assert.ok(src.includes('useTourEnabled()') && src.includes('{tourOn && ('), `${file}: sayr kartasi tourOn bilan`);
    assert.equal((src.match(/navigate\(TOUR_PATH\)/g) ?? []).length, 1, `${file}: sayr tugmasi bitta (dublikatsiya yo'q)`);
  }
});
