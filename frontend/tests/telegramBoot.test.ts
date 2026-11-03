import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initTelegramWebApp,
  triggerHaptic,
  normalizeTableToken,
  parseTableStartParam,
} from '../src/utils/telegramBoot.ts';


test('Telegram WebApp mavjud bo\'lmaganda (brauzerda) xatosiz ishlaydi', () => {
  // @ts-ignore
  global.window = {};
  assert.doesNotThrow(() => {
    initTelegramWebApp();
    triggerHaptic('light');
  });
});

test('Telegram WebApp mavjud bo\'lganda ready() va expand() chaqiriladi', () => {
  let readyCalled = false;
  let expandCalled = false;
  let headerColor = '';
  let bgColor = '';
  let hapticStyle = '';

  // @ts-ignore
  global.window = {
    location: { pathname: '/restaurant/', replace: () => {} },
    addEventListener: () => {},
    Telegram: {
      WebApp: {
        ready: () => { readyCalled = true; },
        expand: () => { expandCalled = true; },
        setHeaderColor: (c: string) => { headerColor = c; },
        setBackgroundColor: (c: string) => { bgColor = c; },
        BackButton: {
          isVisible: false,
          show: () => {},
          hide: () => {},
          onClick: () => {},
          offClick: () => {},
        },
        HapticFeedback: {
          impactOccurred: (style: any) => { hapticStyle = style; },
          notificationOccurred: () => {},
          selectionChanged: () => {},
        },
      },
    },
  };

  initTelegramWebApp();
  triggerHaptic('medium');

  assert.equal(readyCalled, true);
  assert.equal(expandCalled, true);
  // standart palitra — klassik (yashil + krem): Telegram foni krem #F7F3EA
  assert.equal(headerColor, '#FFFFFF');
  assert.equal(bgColor, '#F7F3EA');
  assert.equal(hapticStyle, 'medium');
});

test('Telegram rangi muqobil (apelsin) palitrada avvalgidek: #FFFFFF / #FAF7F2', () => {
  let headerColor = '';
  let bgColor = '';
  // @ts-ignore
  global.window = {
    location: { pathname: '/restaurant/', replace: () => {} },
    addEventListener: () => {},
    __GULISTON_SESSION__: { palette: 'orange' },
    Telegram: {
      WebApp: {
        ready: () => {},
        expand: () => {},
        setHeaderColor: (c: string) => { headerColor = c; },
        setBackgroundColor: (c: string) => { bgColor = c; },
      },
    },
  };
  initTelegramWebApp();
  assert.equal(headerColor, '#FFFFFF');
  assert.equal(bgColor, '#FAF7F2');
});

// ── start_param -> stol tokeni (TZ C7): backend `t/<uuid:token>/` faqat kichik harfli tireli UUID kutadi ──

const HEX = '0123456789abcdef0123456789abcdef';
const DASHED = '01234567-89ab-cdef-0123-456789abcdef';

test('normalizeTableToken: 32 belgili tiresiz hex tireli UUID (8-4-4-4-12) ga aylanadi', () => {
  assert.equal(normalizeTableToken(HEX), DASHED);
  // haqiqiy uuid4().hex ko'rinishi
  assert.equal(
    normalizeTableToken('9f1c2d3e4b5a46789abc0d1e2f3a4b5c'),
    '9f1c2d3e-4b5a-4678-9abc-0d1e2f3a4b5c'
  );
});

test('normalizeTableToken: tireli UUID o\'zgarmaydi', () => {
  assert.equal(normalizeTableToken(DASHED), DASHED);
});

test('normalizeTableToken: katta harf kichikka o\'tadi (Django uuid konvertori faqat kichik harfni qabul qiladi), bo\'sh joy kesiladi', () => {
  assert.equal(normalizeTableToken(HEX.toUpperCase()), DASHED);
  assert.equal(normalizeTableToken(DASHED.toUpperCase()), DASHED);
  assert.equal(normalizeTableToken(`  ${HEX}\n`), DASHED);
});

test('normalizeTableToken: yaroqsiz qiymatlar null qaytaradi', () => {
  const bad: unknown[] = [
    '', ' ', 'abc',
    HEX.slice(1),            // 31 belgi
    HEX + 'a',               // 33 belgi
    'g' + HEX.slice(1),      // hex emas
    '01234567-89ab-cdef-0123-456789abcde',   // 35 belgi
    '0123456789ab-cdef-0123-4567-89abcdef',  // tire noto'g'ri joyda
    '01234567-89ab-cdef-0123-456789abcdef-', // oxirida ortiqcha tire
    `${DASHED}/../x`,
    '../../etc/passwd',
    '//evil.example',
    `${HEX}\n${HEX}`,
    null, undefined, 123, {}, [],
  ];
  for (const v of bad) {
    assert.equal(normalizeTableToken(v), null, `null kutilgan: ${JSON.stringify(v)}`);
  }
});

test('parseTableStartParam: faqat t_ prefiksli va yaroqli token qabul qilinadi', () => {
  assert.equal(parseTableStartParam(`t_${HEX}`), DASHED);
  assert.equal(parseTableStartParam(`t_${DASHED}`), DASHED);
  assert.equal(parseTableStartParam(HEX), null);          // prefiks yo'q
  assert.equal(parseTableStartParam(`T_${HEX}`), null);   // prefiks katta harf
  assert.equal(parseTableStartParam('t_'), null);
  assert.equal(parseTableStartParam('t_zzz'), null);
  assert.equal(parseTableStartParam(undefined), null);
  assert.equal(parseTableStartParam(42), null);
});

function bootWithStartParam(startParam: string | undefined, location: Record<string, unknown>) {
  const replaced: string[] = [];
  // @ts-ignore
  global.window = {
    location: { pathname: '/', search: '', ...location, replace: (u: string) => replaced.push(u) },
    addEventListener: () => {},
    Telegram: {
      WebApp: {
        ready: () => {},
        expand: () => {},
        initDataUnsafe: { start_param: startParam },
      },
    },
  };
  initTelegramWebApp();
  return replaced;
}

test('initTelegramWebApp: tiresiz t_<hex> start_param tireli /t/<uuid>/ ga yo\'naltiriladi', () => {
  assert.deepEqual(bootWithStartParam(`t_${HEX}`, {}), [`/t/${DASHED}/`]);
});

test('initTelegramWebApp: tireli t_<uuid> o\'zgarishsiz yo\'naltiriladi', () => {
  assert.deepEqual(bootWithStartParam(`t_${DASHED}`, {}), [`/t/${DASHED}/`]);
});

test('initTelegramWebApp: yaroqsiz start_param bo\'lsa yo\'naltirilmaydi', () => {
  assert.deepEqual(bootWithStartParam('t_not-a-uuid', {}), []);
  assert.deepEqual(bootWithStartParam('t_../../admin', {}), []);
  assert.deepEqual(bootWithStartParam('boshqa_param', {}), []);
  assert.deepEqual(bootWithStartParam(undefined, {}), []);
});

test('initTelegramWebApp: allaqachon /t/<uuid>/ yoki ?table=<uuid> da bo\'lsa qayta yo\'naltirilmaydi (sikl yo\'q)', () => {
  assert.deepEqual(bootWithStartParam(`t_${HEX}`, { pathname: `/t/${DASHED}/` }), []);
  assert.deepEqual(bootWithStartParam(`t_${HEX}`, { pathname: '/menu/', search: `?table=${DASHED}` }), []);
  // boshqa stol tokeni bo'lsa esa yo'naltiriladi
  const other = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  assert.deepEqual(bootWithStartParam(`t_${HEX}`, { pathname: '/menu/', search: `?table=${other}` }), [`/t/${DASHED}/`]);
});
