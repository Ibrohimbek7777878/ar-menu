import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  NONE_EVENT_KEY,
  addEventType,
  addGeneratedTimes,
  addSlotGroup,
  addSlotTime,
  canRemoveEventType,
  cleanForSave,
  defaultBooking,
  diffBooking,
  isBookingDirty,
  makeKey,
  moveEventType,
  moveItem,
  moveSlotGroup,
  normalizeBooking,
  pathUnder,
  presetBooking,
  removeEventType,
  removeSlotGroup,
  removeSlotTime,
  renameEventType,
  renameSlotGroup,
  setEventTypeTranslation,
  setSlotGroupTranslation,
  slugify,
  stripBookingPrefix,
  toggleClosedWeekday,
  validateBooking,
} from './settingsModel.ts';

// ─── standart to'plam ───

test('defaultBooking: TZ dagi tushlik/kechki va 5 tadbir turi; har chaqiruvda yangi nusxa', () => {
  const a = defaultBooking();
  assert.equal(a.enabled, true);
  assert.deepEqual(a.slots.map((g) => g.key), ['lunch', 'dinner']);
  assert.equal(a.slots[0].label_ru, 'Обед');
  assert.equal(a.event_types[0].label_en, 'None');
  assert.deepEqual(a.slots[0].times, ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00']);
  assert.deepEqual(a.slots[1].times, ['19:30', '20:00', '20:30', '21:00', '21:30']);
  assert.deepEqual(a.event_types.map((t) => t.key), ['none', 'birthday', 'anniversary', 'business', 'wedding']);
  assert.equal(a.duration_minutes, 120);
  assert.equal(a.max_days_ahead, 30);
  assert.equal(a.min_notice_minutes, 60);
  assert.equal(a.auto_confirm, false);
  assert.deepEqual(a.closed_weekdays, []);
  a.slots[0].times.push('16:00');
  assert.equal(defaultBooking().slots[0].times.length, 6, 'nusxalar bog\'lanmagan');
  assert.deepEqual(validateBooking(defaultBooking()), []);
});

test('presetBooking: andoza qaytadi, lekin "Bron yoqilgan" holati saqlanadi', () => {
  const custom = { ...defaultBooking(), enabled: false, duration_minutes: 90, slots: [] };
  const preset = presetBooking(custom);
  assert.equal(preset.enabled, false);
  assert.equal(preset.duration_minutes, 120);
  assert.equal(preset.slots.length, 2);
});

// ─── kalit generatori ───

test('slugify: lotin, kirill va o\'zbekcha apostrof', () => {
  assert.equal(slugify("Tug'ilgan kun"), 'tugilgan_kun');
  assert.equal(slugify("O'zbek oshi"), 'ozbek_oshi');
  assert.equal(slugify('Kechki ovqat'), 'kechki_ovqat');
  assert.equal(slugify('Ish uchrashuvi!'), 'ish_uchrashuvi');
  assert.equal(slugify('  Ziyofat  --  2026 '), 'ziyofat_2026');
  assert.equal(slugify('Туғилган кун'), 'tugilgan_kun');
  assert.equal(slugify('День рождения'), 'den_rojdeniya');
  assert.equal(slugify('Қўшимча'), 'qoshimcha');
  assert.equal(slugify('★★★'), '');
  assert.equal(slugify(''), '');
});

test('slugify: uzunlik chegarasi, oxirida pastki chiziq qolmaydi', () => {
  const long = slugify('juda uzun nomli tadbir turi uchun sinov matni');
  assert.ok(long.length <= LIMITS.keyLength, long);
  assert.doesNotMatch(long, /_$/);
  assert.match(long, /^[a-z0-9_]+$/);
});

test('makeKey: band bo\'lsa raqam qo\'shiladi; belgilar bo\'lsa zaxira', () => {
  assert.equal(makeKey('Yubiley', [], 'type'), 'yubiley');
  assert.equal(makeKey('Yubiley', ['yubiley'], 'type'), 'yubiley_2');
  assert.equal(makeKey('Yubiley', ['yubiley', 'yubiley_2'], 'type'), 'yubiley_3');
  assert.equal(makeKey('★★', [], 'type'), 'type');
  assert.equal(makeKey('★★', ['type'], 'type'), 'type_2');
  assert.equal(makeKey('none', ['none'], 'type'), 'none_2');
});

test('makeKey: raqamli qo\'shimcha ham uzunlik chegarasida qoladi', () => {
  const base = 'a'.repeat(LIMITS.keyLength);
  const key = makeKey(base, [base], 'type');
  assert.ok(key.length <= LIMITS.keyLength);
  assert.ok(key.endsWith('_2'));
  assert.notEqual(key, base);
});

// ─── serverdan o'qish ───

test('normalizeBooking: yo\'q yoki noto\'g\'ri qiymat — standart to\'plam', () => {
  for (const bad of [undefined, null, 'x', 5, [], true]) assert.deepEqual(normalizeBooking(bad), defaultBooking());
});

test('normalizeBooking: bo\'sh ro\'yxatlar bo\'sh qoladi (egasi hammasini olib tashlagan), lekin "none" qaytadi', () => {
  const config = normalizeBooking({ enabled: false, slots: [], event_types: [] });
  assert.equal(config.enabled, false);
  assert.deepEqual(config.slots, []);
  assert.deepEqual(config.event_types, [{ key: 'none', label: "Yo'q" }]);
});

test('normalizeBooking: vaqtlar tartiblanadi/takrorsiz, kalitlar va sonlar tuzatiladi', () => {
  const config = normalizeBooking({
    enabled: true,
    slots: [
      { key: 'lunch', label: ' Tushlik ', times: ['14:00', '12:30:00', '14:00', 'xato', '24:00'], label_ru: ' Обед ', label_en: '' },
      { label: 'Kechki ovqat', times: ['19:30'] },
      { key: 'lunch', label: 'Takror kalit', times: [] },
      'axlat',
      null,
    ],
    event_types: [{ key: 'birthday', label: "Tug'ilgan kun" }, { label: 'Yubiley' }],
    duration_minutes: '90',
    max_days_ahead: 45.4,
    min_notice_minutes: 'abc',
    auto_confirm: 'ha',
    closed_weekdays: [6, 0, 6, 9, -1, '2', 'x'],
  });
  assert.deepEqual(config.slots[0], { key: 'lunch', label: 'Tushlik', label_ru: 'Обед', times: ['12:30', '14:00'] });
  assert.equal(config.slots[1].key, 'kechki_ovqat');
  assert.equal(config.slots[2].key, 'takror_kalit'); // takror kalit almashtirildi
  assert.equal(config.slots.length, 3);
  assert.deepEqual(config.event_types.map((t) => t.key), ['none', 'birthday', 'yubiley']); // none boshiga qo'shildi
  assert.equal(config.duration_minutes, 90);
  assert.equal(config.max_days_ahead, 45);
  assert.equal(config.min_notice_minutes, 60); // son emas -> standart
  assert.equal(config.auto_confirm, false); // mantiqiy emas -> standart
  assert.deepEqual(config.closed_weekdays, [0, 2, 6]);
});

test('normalizeBooking: bilinmagan qo\'shimcha maydonlar saqlanadi (PATCH to\'liq almashtirish)', () => {
  const config = normalizeBooking({ ...defaultBooking(), future_flag: { a: 1 }, slots: [{ key: 'lunch', label: 'Tushlik', times: ['12:00'], capacity: 40 }] });
  assert.deepEqual((config as unknown as Record<string, unknown>).future_flag, { a: 1 });
  assert.equal((config.slots[0] as unknown as Record<string, unknown>).capacity, 40);
});

// ─── tahrir amallari ───

test('addSlotGroup: kalit nomdan, takror nom — yangi kalit; bo\'sh nom qo\'shilmaydi', () => {
  let config = defaultBooking();
  config = addSlotGroup(config, '  Nonushta ');
  assert.deepEqual(config.slots.at(-1), { key: 'nonushta', label: 'Nonushta', times: [] });
  config = addSlotGroup(config, 'Nonushta');
  assert.equal(config.slots.at(-1)?.key, 'nonushta_2');
  const unchanged = addSlotGroup(config, '   ');
  assert.equal(unchanged, config);
});

test('addSlotGroup: guruhlar soni cheklangan', () => {
  let config = { ...defaultBooking(), slots: [] as ReturnType<typeof defaultBooking>['slots'] };
  for (let i = 0; i < LIMITS.groups + 3; i += 1) config = addSlotGroup(config, `Guruh ${i}`);
  assert.equal(config.slots.length, LIMITS.groups);
});

test('renameSlotGroup: nom o\'zgaradi, KALIT o\'zgarmaydi; noto\'g\'ri indeks — o\'zgarishsiz', () => {
  const config = defaultBooking();
  const renamed = renameSlotGroup(config, 0, 'Tushki ovqat');
  assert.equal(renamed.slots[0].label, 'Tushki ovqat');
  assert.equal(renamed.slots[0].key, 'lunch');
  assert.equal(config.slots[0].label, 'Tushlik', 'asl ob\'ekt o\'zgarmaydi');
  assert.equal(renameSlotGroup(config, 7, 'x'), config);
  assert.equal(renameSlotGroup(config, -1, 'x'), config);
});

test('setSlotGroupTranslation / setEventTypeTranslation', () => {
  let config = setSlotGroupTranslation(defaultBooking(), 1, 'ru', 'Ужин');
  config = setSlotGroupTranslation(config, 1, 'en', 'Dinner');
  assert.equal(config.slots[1].label_ru, 'Ужин');
  assert.equal(config.slots[1].label_en, 'Dinner');
  config = setEventTypeTranslation(config, 1, 'en', 'Birthday');
  assert.equal(config.event_types[1].label_en, 'Birthday');
  assert.equal(setEventTypeTranslation(config, 99, 'en', 'x'), config);
});

test('removeSlotGroup / moveSlotGroup', () => {
  const config = defaultBooking();
  assert.deepEqual(removeSlotGroup(config, 0).slots.map((g) => g.key), ['dinner']);
  assert.equal(removeSlotGroup(config, 5), config);
  assert.deepEqual(moveSlotGroup(config, 0, 1).slots.map((g) => g.key), ['dinner', 'lunch']);
  assert.deepEqual(moveSlotGroup(config, 0, -1).slots.map((g) => g.key), ['lunch', 'dinner']);
});

test('moveItem: chegaradan chiqmaydi', () => {
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 1), [1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 1), [1, 3, 2]);
  assert.deepEqual(moveItem([1, 2, 3], 2, -2), [3, 1, 2]);
  assert.deepEqual(moveItem([1, 2, 3], 5, -1), [1, 2, 3]);
  assert.deepEqual(moveItem([], 0, 1), []);
});

test('addSlotTime: tartibli qo\'shiladi; takror, yaroqsiz va 24:00 rad etiladi', () => {
  const config = defaultBooking();
  const added = addSlotTime(config, 0, '12:45');
  assert.equal(added.status, 'added');
  assert.deepEqual(added.config.slots[0].times, ['12:30', '12:45', '13:00', '13:30', '14:00', '14:30', '15:00']);
  assert.equal(addSlotTime(added.config, 0, '12:45').status, 'duplicate');
  assert.equal(addSlotTime(config, 0, '9:05').config.slots[0].times[0], '09:05');
  assert.equal(addSlotTime(config, 0, '24:00').status, 'invalid');
  assert.equal(addSlotTime(config, 0, '').status, 'invalid');
  assert.equal(addSlotTime(config, 9, '10:00').status, 'invalid');
  assert.equal(addSlotTime(config, 0, '12:30').config, config, 'takrorda ob\'ekt o\'zgarmaydi');
});

test('addSlotTime: bo\'sh guruhga birinchi vaqt', () => {
  const empty = addSlotGroup(defaultBooking(), 'Kech');
  const res = addSlotTime(empty, 2, '22:00');
  assert.equal(res.status, 'added');
  assert.deepEqual(res.config.slots[2].times, ['22:00']);
});

test('addGeneratedTimes: mavjudlar takrorlanmaydi, qo\'shilgan/o\'tkazib yuborilgan sanaladi', () => {
  const config = defaultBooking();
  const res = addGeneratedTimes(config, 0, '12:00', '15:00', 30);
  assert.ok(res.ok);
  if (res.ok) {
    assert.deepEqual(res.config.slots[0].times, ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00']);
    assert.equal(res.added, 1);
    assert.equal(res.skipped, 6);
  }
});

test('addGeneratedTimes: 24:00 ga o\'tish, xatolar', () => {
  const empty = addSlotGroup(defaultBooking(), 'Kech');
  const night = addGeneratedTimes(empty, 2, '22:00', '24:00', 30);
  assert.ok(night.ok && night.config.slots[2].times.join() === '22:00,22:30,23:00,23:30');
  assert.deepEqual(addGeneratedTimes(empty, 2, '23:00', '01:00', 30), { ok: false, error: 'end_before_start' });
  assert.deepEqual(addGeneratedTimes(empty, 9, '10:00', '11:00', 30), { ok: false, error: 'no_group' });
  assert.deepEqual(addGeneratedTimes(empty, 2, '10:00', '11:00', 1), { ok: false, error: 'invalid_step' });
});

test('removeSlotTime: bo\'sh guruh hosil bo\'lishi mumkin; mavjud bo\'lmagan vaqt — o\'zgarishsiz', () => {
  let config = addSlotGroup({ ...defaultBooking(), slots: [] }, 'Kech');
  config = addSlotTime(config, 0, '22:00').config;
  const emptied = removeSlotTime(config, 0, '22:00');
  assert.deepEqual(emptied.slots[0].times, []);
  assert.equal(removeSlotTime(config, 0, '23:00'), config);
  assert.equal(removeSlotTime(config, 3, '22:00'), config);
});

test('tadbir turlari: qo\'shish, nom, surish', () => {
  let config = defaultBooking();
  config = addEventType(config, 'Bolalar bayrami');
  assert.deepEqual(config.event_types.at(-1), { key: 'bolalar_bayrami', label: 'Bolalar bayrami' });
  config = renameEventType(config, 5, 'Bolalar kechasi');
  assert.equal(config.event_types[5].label, 'Bolalar kechasi');
  assert.equal(config.event_types[5].key, 'bolalar_bayrami', 'kalit o\'zgarmaydi');
  config = moveEventType(config, 5, -4);
  assert.deepEqual(config.event_types.map((t) => t.key), ['none', 'bolalar_bayrami', 'birthday', 'anniversary', 'business', 'wedding']);
  assert.equal(addEventType(config, ' '), config);
});

test('tadbir turi kaliti mavjud "none" bilan to\'qnashmaydi', () => {
  const config = addEventType(defaultBooking(), 'None');
  assert.equal(config.event_types.at(-1)?.key, 'none_2');
});

test('"none" turi olib tashlanmaydi, faqat nomi o\'zgaradi', () => {
  const config = defaultBooking();
  assert.equal(canRemoveEventType(config.event_types[0]), false);
  assert.equal(canRemoveEventType(config.event_types[1]), true);
  assert.equal(removeEventType(config, 0), config);
  const renamed = renameEventType(config, 0, 'Tadbirsiz');
  assert.equal(renamed.event_types[0].key, NONE_EVENT_KEY);
  assert.equal(renamed.event_types[0].label, 'Tadbirsiz');
  assert.deepEqual(removeEventType(config, 1).event_types.map((t) => t.key), ['none', 'anniversary', 'business', 'wedding']);
  assert.equal(removeEventType(config, 99), config);
});

test('toggleClosedWeekday: tartiblangan, takror yo\'q, noto\'g\'ri kun e\'tiborsiz', () => {
  let config = defaultBooking();
  config = toggleClosedWeekday(config, 6);
  config = toggleClosedWeekday(config, 0);
  assert.deepEqual(config.closed_weekdays, [0, 6]);
  config = toggleClosedWeekday(config, 6);
  assert.deepEqual(config.closed_weekdays, [0]);
  assert.equal(toggleClosedWeekday(config, 7), config);
  assert.equal(toggleClosedWeekday(config, 1.5), config);
});

// ─── tekshiruv ───

const codes = (config: ReturnType<typeof defaultBooking>) => validateBooking(config).map((i) => `${i.path}:${i.code}`);

test('validateBooking: bo\'sh guruh va nomsiz guruh', () => {
  let config = addSlotGroup(defaultBooking(), 'Kech');
  assert.deepEqual(codes(config), ['slots[2].times:times_empty']);
  config = renameSlotGroup(config, 0, '   ');
  assert.deepEqual(codes(config), ['slots[0].label:label_required', 'slots[2].times:times_empty']);
});

test('validateBooking: yoqilgan bronda birorta vaqt yo\'q — xato; o\'chirilgan bronda mumkin', () => {
  const empty = { ...defaultBooking(), slots: [] };
  assert.deepEqual(codes(empty), ['slots:no_times']);
  assert.deepEqual(codes({ ...empty, enabled: false }), []);
});

test('validateBooking: yaroqsiz va takror vaqtlar yo\'li bilan', () => {
  const config = defaultBooking();
  config.slots[1].times = ['19:30', 'xato', '19:30', '24:00'];
  assert.deepEqual(codes(config), ['slots[1].times[1]:time_invalid', 'slots[1].times[2]:time_duplicate', 'slots[1].times[3]:time_invalid']);
});

test('validateBooking: sonli maydonlar chegarasi (NaN, kasr, oraliq)', () => {
  const config = { ...defaultBooking(), duration_minutes: Number.NaN, max_days_ahead: 0, min_notice_minutes: -5 };
  assert.deepEqual(codes(config), ['duration_minutes:duration_range', 'max_days_ahead:max_days_range', 'min_notice_minutes:min_notice_range']);
  assert.deepEqual(codes({ ...defaultBooking(), duration_minutes: LIMITS.duration.max + 1 }), ['duration_minutes:duration_range']);
  assert.deepEqual(codes({ ...defaultBooking(), duration_minutes: 90.5 }), ['duration_minutes:duration_range']);
  assert.deepEqual(codes({ ...defaultBooking(), duration_minutes: LIMITS.duration.min, max_days_ahead: LIMITS.maxDaysAhead.max, min_notice_minutes: 0 }), []);
});

test('validateBooking: nom uzunligi, takror kalit, "none" yo\'qligi, hamma kun yopiq', () => {
  const config = defaultBooking();
  config.event_types[1].label = 'x'.repeat(LIMITS.labelLength + 1);
  config.event_types[2].key = 'birthday';
  config.event_types[3].label_ru = 'y'.repeat(LIMITS.labelLength + 1);
  assert.deepEqual(codes(config), ['event_types[1].label:label_too_long', 'event_types[2].key:key_duplicate', 'event_types[3].label_ru:label_too_long']);
  assert.deepEqual(codes({ ...defaultBooking(), event_types: defaultBooking().event_types.slice(1) }), ['event_types:none_missing']);
  assert.deepEqual(codes({ ...defaultBooking(), closed_weekdays: [0, 1, 2, 3, 4, 5, 6] }), ['closed_weekdays:all_closed']);
  assert.deepEqual(codes({ ...defaultBooking(), enabled: false, closed_weekdays: [0, 1, 2, 3, 4, 5, 6] }), []);
});

test('pathUnder / stripBookingPrefix', () => {
  assert.equal(pathUnder('slots[1].times[0]', 'slots[1]'), true);
  assert.equal(pathUnder('slots[1]', 'slots[1]'), true);
  assert.equal(pathUnder('slots[10].label', 'slots[1]'), false);
  assert.equal(pathUnder('slots[1].times[0]', 'slots'), true);
  assert.equal(pathUnder('slotsX', 'slots'), false);
  assert.equal(pathUnder('event_types[0].label', 'slots'), false);
  assert.equal(stripBookingPrefix('booking.slots[1].times[0]'), 'slots[1].times[0]');
  assert.equal(stripBookingPrefix('booking'), '');
  assert.equal(stripBookingPrefix('duration_minutes'), 'duration_minutes');
  assert.equal(stripBookingPrefix(undefined as unknown as string), '');
});

// ─── saqlashga tayyorlash va farq ───

test('cleanForSave: bo\'sh tarjimalar tushadi, nomlar kesiladi, vaqt/kunlar tartiblanadi', () => {
  const config = defaultBooking();
  config.slots[0].label = '  Tushlik  ';
  config.slots[0].label_ru = '   ';
  config.slots[0].label_en = ' Lunch ';
  config.slots[0].times = ['14:00', '12:30', '14:00'];
  config.closed_weekdays = [6, 0];
  const clean = cleanForSave(config);
  assert.equal(clean.slots[0].label, 'Tushlik');
  assert.equal('label_ru' in clean.slots[0], false);
  assert.equal(clean.slots[0].label_en, 'Lunch');
  assert.deepEqual(clean.slots[0].times, ['12:30', '14:00']);
  assert.deepEqual(clean.closed_weekdays, [0, 6]);
  assert.equal(config.slots[0].label, '  Tushlik  ', 'asl o\'zgarmaydi');
});

test('diffBooking: o\'zgarish yo\'q — bo\'sh ro\'yxat (bo\'sh joylar va bo\'sh tarjima farq emas)', () => {
  const saved = defaultBooking();
  assert.deepEqual(diffBooking(saved, defaultBooking()), []);
  const same = defaultBooking();
  same.slots[0].label = ' Tushlik ';
  same.slots[0].label_ru = ' Обед ';
  same.slots[0].times = [...same.slots[0].times].reverse();
  assert.equal(isBookingDirty(saved, same), false);
  // Tarjimasiz saqlangan nomga bo'sh tarjima yozish ham farq emas; haqiqiy tarjima qo'shish farq
  const bare = { ...defaultBooking(), event_types: [{ key: 'none', label: "Yo'q" }] };
  assert.equal(isBookingDirty(bare, setEventTypeTranslation(bare, 0, 'ru', '  ')), false);
  assert.equal(isBookingDirty(bare, setEventTypeTranslation(bare, 0, 'ru', 'Нет')), true);
  // Mavjud tarjimani o'chirish — farq
  assert.equal(isBookingDirty(saved, setSlotGroupTranslation(saved, 0, 'ru', '')), true);
});

test('diffBooking: qo\'shish / o\'chirish / nom / vaqt / tarjima', () => {
  const saved = defaultBooking();
  let draft = addSlotGroup(saved, 'Nonushta');
  draft = removeSlotGroup(draft, 1); // kechki ovqat o'chdi
  draft = renameSlotGroup(draft, 0, 'Tushki ovqat');
  draft = addEventType(draft, 'Bayram');
  draft = removeEventType(draft, 4); // wedding o'chdi
  draft = setEventTypeTranslation(draft, 1, 'ru', 'День варенья');
  assert.deepEqual(diffBooking(saved, draft), [
    { kind: 'group_changed', name: 'Tushki ovqat' },
    { kind: 'group_added', name: 'Nonushta' },
    { kind: 'group_removed', name: 'Kechki ovqat' },
    { kind: 'type_changed', name: "Tug'ilgan kun" },
    { kind: 'type_added', name: 'Bayram' },
    { kind: 'type_removed', name: 'Nikoh taklifi' },
  ]);
});

test('diffBooking: vaqt qo\'shish va olib tashlash guruhni "o\'zgargan" qiladi; qaytarilsa farq yo\'q', () => {
  const saved = defaultBooking();
  const added = addSlotTime(saved, 0, '16:00').config;
  assert.deepEqual(diffBooking(saved, added), [{ kind: 'group_changed', name: 'Tushlik' }]);
  assert.deepEqual(diffBooking(saved, removeSlotTime(added, 0, '16:00')), []);
});

test('diffBooking: tartib o\'zgarishi, qoidalar va yoqish', () => {
  const saved = defaultBooking();
  assert.deepEqual(diffBooking(saved, moveSlotGroup(saved, 0, 1)), [{ kind: 'groups_reordered' }]);
  assert.deepEqual(diffBooking(saved, moveEventType(saved, 1, 1)), [{ kind: 'types_reordered' }]);
  const draft = { ...saved, enabled: false, duration_minutes: 90, max_days_ahead: 60, min_notice_minutes: 0, auto_confirm: true, closed_weekdays: [0] };
  assert.deepEqual(
    diffBooking(saved, draft).map((c) => c.kind),
    ['enabled', 'duration', 'max_days', 'min_notice', 'auto_confirm', 'closed_weekdays'],
  );
});

test('diffBooking: tartib o\'zgargani qo\'shilgan element tufayli noto\'g\'ri chiqmaydi', () => {
  const saved = defaultBooking();
  const draft = addEventType(saved, 'Yangi');
  assert.deepEqual(diffBooking(saved, draft), [{ kind: 'type_added', name: 'Yangi' }]);
  const removed = removeEventType(saved, 2);
  assert.deepEqual(diffBooking(saved, removed), [{ kind: 'type_removed', name: 'Yubiley' }]);
});
