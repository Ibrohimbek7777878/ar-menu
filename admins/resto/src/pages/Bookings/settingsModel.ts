/**
 * Bron sozlamalari ("booking" ob'ekti) modeli: standart to'plam, serverdan kelganini tuzatib o'qish, tahrir amallari (o'zgarmas:
 * har amal YANGI ob'ekt qaytaradi), tekshiruv, saqlashga tayyorlash va farqni hisoblash. SOF mantiq: `node --test` bilan sinaladi.
 *
 * Muhim qoidalar:
 *  - kalit (key) faqat YARATILGANDA hosil bo'ladi va keyin o'zgarmaydi: nomni o'zgartirish eski bronlarni buzmaydi;
 *  - `none` ("Yo'q") tadbir turi olib tashlanmaydi, faqat nomi o'zgaradi (mehmon "tadbirsiz" tanlay olishi shart);
 *  - bilinmagan qo'shimcha maydonlar (kelajakdagi server maydonlari) tahrirda yo'qolmaydi: PATCH to'liq almashtirish bo'lgani uchun
 *    ularni tushirib yuborsak, serverdagi ma'lumot jimgina o'chib ketardi.
 */
import type { BookingConfig, EventType, SlotGroup, TranslatedName } from './types.ts';
import { generateTimes, mergeTimes, parseTime, sortUniqueTimes } from './time.ts';
import type { GenerateError } from './time.ts';

export const NONE_EVENT_KEY = 'none';

export const LIMITS = {
  duration: { min: 30, max: 480 },
  maxDaysAhead: { min: 1, max: 365 },
  minNotice: { min: 0, max: 10080 },
  labelLength: 40,
  groups: 12,
  eventTypes: 30,
  timesPerGroup: 96,
  keyLength: 24,
} as const;

/**
 * Tayyor andoza (TZ 1-bosqich): tushlik/kechki ovqat va 5 tadbir turi. Har chaqiruvda yangi nusxa.
 * Ruscha va inglizcha nomlar ham beriladi: mehmon sayti boshqa tilda ham tushunarli ko'rsatsin (egasi xohlasa o'zgartiradi).
 */
export function defaultBooking(): BookingConfig {
  return {
    enabled: true,
    slots: [
      { key: 'lunch', label: 'Tushlik', label_ru: 'Обед', label_en: 'Lunch', times: ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00'] },
      { key: 'dinner', label: 'Kechki ovqat', label_ru: 'Ужин', label_en: 'Dinner', times: ['19:30', '20:00', '20:30', '21:00', '21:30'] },
    ],
    event_types: [
      { key: NONE_EVENT_KEY, label: "Yo'q", label_ru: 'Нет', label_en: 'None' },
      { key: 'birthday', label: "Tug'ilgan kun", label_ru: 'День рождения', label_en: 'Birthday' },
      { key: 'anniversary', label: 'Yubiley', label_ru: 'Юбилей', label_en: 'Anniversary' },
      { key: 'business', label: 'Ish uchrashuvi', label_ru: 'Деловая встреча', label_en: 'Business meeting' },
      { key: 'wedding', label: 'Nikoh taklifi', label_ru: 'Предложение руки и сердца', label_en: 'Marriage proposal' },
    ],
    duration_minutes: 120,
    max_days_ahead: 30,
    min_notice_minutes: 60,
    auto_confirm: false,
    closed_weekdays: [],
  };
}

/** Tayyor andozani qaytarish: "Bron yoqilgan" holati o'zgarmaydi (andoza faqat vaqtlar, tadbir turlari va qoidalarni tiklaydi). */
export function presetBooking(current: BookingConfig): BookingConfig {
  return { ...defaultBooking(), enabled: current.enabled };
}

// ─── Kalit generatori ───

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** Nomdan lotincha kalit asosi: kichik harf, [a-z0-9_], 24 belgigacha. O'zbekcha apostrof (o', g', tug'ilgan) tushirib qoldiriladi. */
export function slugify(label: string): string {
  const lower = String(label ?? '').toLowerCase();
  let out = '';
  for (const ch of lower) {
    if ("'`ʻʼ’‘".includes(ch)) continue;
    out += ch in CYRILLIC_TO_LATIN ? CYRILLIC_TO_LATIN[ch] : ch;
  }
  return out
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, LIMITS.keyLength)
    .replace(/_+$/g, '');
}

/**
 * Noyob kalit: nomdan hosil qilinadi; band bo'lsa `_2`, `_3` … qo'shiladi; nom lotinchaga aylanmasa (masalan faqat belgilar)
 * `fallback` ishlatiladi. Natija doim `taken` da yo'q.
 */
export function makeKey(label: string, taken: readonly string[], fallback: string): string {
  const base = slugify(label) || fallback;
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `_${n}`;
    const candidate = `${base.slice(0, LIMITS.keyLength - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

// ─── Serverdan o'qish ───

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function whole(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** Nomni tozalaydi: bo'sh joylar kesiladi, bo'sh ru/en tarjimalar olib tashlanadi. */
function cleanName<T extends TranslatedName>(item: T): T {
  const next: T = { ...item, key: String(item.key).trim(), label: String(item.label ?? '').trim() };
  for (const field of ['label_ru', 'label_en'] as const) {
    const value = typeof next[field] === 'string' ? (next[field] as string).trim() : '';
    if (value) next[field] = value;
    else delete next[field];
  }
  return next;
}

function normalizeNamed<T extends TranslatedName>(raw: unknown[], fallbackKey: string, extra: (item: Record<string, unknown>) => Partial<T>): T[] {
  const taken: string[] = [];
  const items: T[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const label = text(entry.label).trim();
    let key = text(entry.key).trim();
    // Kalit yo'q yoki takror bo'lsa — yangisi (aks holda ikki element bir-birini bosib ketadi)
    if (!key || taken.includes(key)) key = makeKey(label, taken, fallbackKey);
    taken.push(key);
    items.push(cleanName({ ...entry, key, label, ...extra(entry) } as unknown as T));
  }
  return items;
}

function normalizeWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const days = new Set<number>();
  for (const value of raw) {
    const n = whole(value, -1);
    if (n >= 0 && n <= 6) days.add(n);
  }
  return [...days].sort((a, b) => a - b);
}

/** Tadbir turlarida `none` bo'lishini ta'minlaydi (yo'q bo'lsa boshiga qo'shadi). */
function ensureNone(types: EventType[]): EventType[] {
  if (types.some((type) => type.key === NONE_EVENT_KEY)) return types;
  return [{ key: NONE_EVENT_KEY, label: "Yo'q" }, ...types];
}

/**
 * Serverdan kelgan `booking` ni tahrirlash uchun tayyor ob'ektga aylantiradi. Maydon yo'q bo'lsa — standart qiymat;
 * ro'yxat bor lekin bo'sh bo'lsa — bo'sh qoladi (egasi hammasini olib tashlagan bo'lishi mumkin). Hech qachon xato tashlamaydi.
 */
export function normalizeBooking(raw: unknown): BookingConfig {
  const base = defaultBooking();
  if (!isRecord(raw)) return base;
  const slots = Array.isArray(raw.slots)
    ? normalizeNamed<SlotGroup>(raw.slots, 'group', (item) => ({ times: sortUniqueTimes(Array.isArray(item.times) ? item.times : []) }))
    : base.slots;
  const eventTypes = Array.isArray(raw.event_types) ? ensureNone(normalizeNamed<EventType>(raw.event_types, 'type', () => ({}))) : base.event_types;
  return {
    ...raw,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled,
    slots,
    event_types: eventTypes,
    duration_minutes: whole(raw.duration_minutes, base.duration_minutes),
    max_days_ahead: whole(raw.max_days_ahead, base.max_days_ahead),
    min_notice_minutes: whole(raw.min_notice_minutes, base.min_notice_minutes),
    auto_confirm: typeof raw.auto_confirm === 'boolean' ? raw.auto_confirm : base.auto_confirm,
    closed_weekdays: normalizeWeekdays(raw.closed_weekdays),
  };
}

/** Saqlashga tayyorlash: nomlar kesiladi, bo'sh tarjimalar olib tashlanadi, vaqtlar tartiblanadi, hafta kunlari tartiblanadi. */
export function cleanForSave(config: BookingConfig): BookingConfig {
  return {
    ...config,
    slots: config.slots.map((group) => cleanName({ ...group, times: sortUniqueTimes(group.times) })),
    event_types: config.event_types.map((type) => cleanName(type)),
    closed_weekdays: normalizeWeekdays(config.closed_weekdays),
  };
}

// ─── Tahrir amallari (o'zgarmas) ───

type Lang = 'ru' | 'en';

function replaceAt<T>(list: readonly T[], index: number, next: T): T[] {
  return list.map((item, i) => (i === index ? next : item));
}

function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Elementni `delta` qadamga suradi (-1 yuqoriga, +1 pastga); chegaradan chiqsa o'zgarishsiz. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length || delta === 0) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function canAddGroup(config: BookingConfig): boolean {
  return config.slots.length < LIMITS.groups;
}

export function addSlotGroup(config: BookingConfig, label: string): BookingConfig {
  const name = label.trim();
  if (!name || !canAddGroup(config)) return config;
  const key = makeKey(name, config.slots.map((group) => group.key), 'group');
  return { ...config, slots: [...config.slots, { key, label: name, times: [] }] };
}

export function renameSlotGroup(config: BookingConfig, index: number, label: string): BookingConfig {
  const group = config.slots[index];
  if (!group) return config;
  return { ...config, slots: replaceAt(config.slots, index, { ...group, label }) };
}

export function setSlotGroupTranslation(config: BookingConfig, index: number, lang: Lang, value: string): BookingConfig {
  const group = config.slots[index];
  if (!group) return config;
  return { ...config, slots: replaceAt(config.slots, index, { ...group, [`label_${lang}`]: value }) };
}

export function removeSlotGroup(config: BookingConfig, index: number): BookingConfig {
  if (!config.slots[index]) return config;
  return { ...config, slots: removeAt(config.slots, index) };
}

export function moveSlotGroup(config: BookingConfig, index: number, delta: number): BookingConfig {
  return { ...config, slots: moveItem(config.slots, index, delta) };
}

export type AddTimeStatus = 'added' | 'duplicate' | 'invalid' | 'full';

export function addSlotTime(config: BookingConfig, groupIndex: number, time: string): { config: BookingConfig; status: AddTimeStatus } {
  const group = config.slots[groupIndex];
  if (!group) return { config, status: 'invalid' };
  if (parseTime(time) === null) return { config, status: 'invalid' };
  const merged = mergeTimes(group.times, [time]);
  if (merged.added === 0) return { config, status: 'duplicate' };
  if (merged.times.length > LIMITS.timesPerGroup) return { config, status: 'full' };
  return { config: { ...config, slots: replaceAt(config.slots, groupIndex, { ...group, times: merged.times }) }, status: 'added' };
}

export type GenerateOutcome =
  | { ok: true; config: BookingConfig; added: number; skipped: number }
  | { ok: false; error: GenerateError | 'full' | 'no_group' };

/** "Har N daqiqada" generatori natijasini guruhga qo'shadi (mavjud vaqtlar takrorlanmaydi). */
export function addGeneratedTimes(config: BookingConfig, groupIndex: number, start: string, end: string, step: number): GenerateOutcome {
  const group = config.slots[groupIndex];
  if (!group) return { ok: false, error: 'no_group' };
  const generated = generateTimes(start, end, step);
  if (!generated.ok) return generated;
  const merged = mergeTimes(group.times, generated.times);
  if (merged.times.length > LIMITS.timesPerGroup) return { ok: false, error: 'full' };
  return {
    ok: true,
    config: { ...config, slots: replaceAt(config.slots, groupIndex, { ...group, times: merged.times }) },
    added: merged.added,
    skipped: generated.times.length - merged.added,
  };
}

export function removeSlotTime(config: BookingConfig, groupIndex: number, time: string): BookingConfig {
  const group = config.slots[groupIndex];
  if (!group) return config;
  const times = group.times.filter((value) => value !== time);
  if (times.length === group.times.length) return config;
  return { ...config, slots: replaceAt(config.slots, groupIndex, { ...group, times }) };
}

export function canAddEventType(config: BookingConfig): boolean {
  return config.event_types.length < LIMITS.eventTypes;
}

export function addEventType(config: BookingConfig, label: string): BookingConfig {
  const name = label.trim();
  if (!name || !canAddEventType(config)) return config;
  const key = makeKey(name, config.event_types.map((type) => type.key), 'type');
  return { ...config, event_types: [...config.event_types, { key, label: name }] };
}

export function renameEventType(config: BookingConfig, index: number, label: string): BookingConfig {
  const type = config.event_types[index];
  if (!type) return config;
  return { ...config, event_types: replaceAt(config.event_types, index, { ...type, label }) };
}

export function setEventTypeTranslation(config: BookingConfig, index: number, lang: Lang, value: string): BookingConfig {
  const type = config.event_types[index];
  if (!type) return config;
  return { ...config, event_types: replaceAt(config.event_types, index, { ...type, [`label_${lang}`]: value }) };
}

export function moveEventType(config: BookingConfig, index: number, delta: number): BookingConfig {
  return { ...config, event_types: moveItem(config.event_types, index, delta) };
}

/** `none` olib tashlanmaydi (faqat nomi o'zgaradi). */
export const canRemoveEventType = (type: EventType): boolean => type.key !== NONE_EVENT_KEY;

export function removeEventType(config: BookingConfig, index: number): BookingConfig {
  const type = config.event_types[index];
  if (!type || !canRemoveEventType(type)) return config;
  return { ...config, event_types: removeAt(config.event_types, index) };
}

export function toggleClosedWeekday(config: BookingConfig, weekday: number): BookingConfig {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return config;
  const closed = config.closed_weekdays.includes(weekday)
    ? config.closed_weekdays.filter((day) => day !== weekday)
    : [...config.closed_weekdays, weekday];
  return { ...config, closed_weekdays: closed.sort((a, b) => a - b) };
}

// ─── Tekshiruv ───

export type IssueCode =
  | 'duration_range'
  | 'max_days_range'
  | 'min_notice_range'
  | 'label_required'
  | 'label_too_long'
  | 'key_duplicate'
  | 'times_empty'
  | 'time_invalid'
  | 'time_duplicate'
  | 'no_times'
  | 'none_missing'
  | 'all_closed'
  | 'too_many_times';

export interface BookingIssue {
  /** Server `field` bilan bir xil yozuv ("booking." prefiksisiz): `slots[1].times[0]`, `event_types[2].label`, `duration_minutes` … */
  path: string;
  code: IssueCode;
  params?: Record<string, number>;
}

function checkRange(value: number, range: { min: number; max: number }, path: string, code: IssueCode, issues: BookingIssue[]) {
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    issues.push({ path, code, params: { min: range.min, max: range.max } });
  }
}

function checkNames(items: readonly TranslatedName[], root: string, issues: BookingIssue[]) {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const label = String(item.label ?? '').trim();
    if (!label) issues.push({ path: `${root}[${i}].label`, code: 'label_required' });
    else if (label.length > LIMITS.labelLength) issues.push({ path: `${root}[${i}].label`, code: 'label_too_long', params: { max: LIMITS.labelLength } });
    for (const field of ['label_ru', 'label_en'] as const) {
      const value = item[field];
      if (typeof value === 'string' && value.trim().length > LIMITS.labelLength) {
        issues.push({ path: `${root}[${i}].${field}`, code: 'label_too_long', params: { max: LIMITS.labelLength } });
      }
    }
    if (seen.has(item.key)) issues.push({ path: `${root}[${i}].key`, code: 'key_duplicate' });
    seen.add(item.key);
  });
}

/** Saqlashdan oldingi tekshiruv. Server baribir qayta tekshiradi; bu yerda tez va maydon yonida ko'rsatish uchun. */
export function validateBooking(config: BookingConfig): BookingIssue[] {
  const issues: BookingIssue[] = [];
  checkRange(config.duration_minutes, LIMITS.duration, 'duration_minutes', 'duration_range', issues);
  checkRange(config.max_days_ahead, LIMITS.maxDaysAhead, 'max_days_ahead', 'max_days_range', issues);
  checkRange(config.min_notice_minutes, LIMITS.minNotice, 'min_notice_minutes', 'min_notice_range', issues);

  checkNames(config.slots, 'slots', issues);
  config.slots.forEach((group, i) => {
    if (group.times.length === 0) {
      issues.push({ path: `slots[${i}].times`, code: 'times_empty' });
      return;
    }
    if (group.times.length > LIMITS.timesPerGroup) issues.push({ path: `slots[${i}].times`, code: 'too_many_times', params: { max: LIMITS.timesPerGroup } });
    const seen = new Set<number>();
    group.times.forEach((time, j) => {
      const minutes = parseTime(time);
      if (minutes === null) issues.push({ path: `slots[${i}].times[${j}]`, code: 'time_invalid' });
      else if (seen.has(minutes)) issues.push({ path: `slots[${i}].times[${j}]`, code: 'time_duplicate' });
      else seen.add(minutes);
    });
  });
  // Bron yoqilgan, lekin birorta ham vaqt yo'q: mehmon hech narsa tanlay olmaydi
  if (config.enabled && config.slots.every((group) => group.times.length === 0) && !issues.some((issue) => issue.code === 'times_empty')) {
    issues.push({ path: 'slots', code: 'no_times' });
  }

  checkNames(config.event_types, 'event_types', issues);
  if (!config.event_types.some((type) => type.key === NONE_EVENT_KEY)) issues.push({ path: 'event_types', code: 'none_missing' });

  if (config.enabled && new Set(config.closed_weekdays).size >= 7) issues.push({ path: 'closed_weekdays', code: 'all_closed' });
  return issues;
}

/** `slots[1].times[0]` ni `slots[1]` ga tegishli deb topish uchun: yo'l shu prefiks bilan boshlanadimi (`slots[1]` ≠ `slots[10]`). */
export function pathUnder(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  return path.startsWith(prefix) && (path[prefix.length] === '.' || path[prefix.length] === '[');
}

/** Server `field` ini ("booking.slots[1].times[0]") shu modulning yo'li ("slots[1].times[0]") ga keltiradi. */
export function stripBookingPrefix(field: string): string {
  return String(field ?? '').replace(/^booking\.?/, '');
}

// ─── Farq ───

export type ChangeKind =
  | 'enabled'
  | 'group_added'
  | 'group_removed'
  | 'group_changed'
  | 'groups_reordered'
  | 'type_added'
  | 'type_removed'
  | 'type_changed'
  | 'types_reordered'
  | 'duration'
  | 'max_days'
  | 'min_notice'
  | 'auto_confirm'
  | 'closed_weekdays';

export interface BookingChange {
  kind: ChangeKind;
  /** Tegishli guruh/tur nomi (bo'lsa) */
  name?: string;
}

function canonicalNamed(item: TranslatedName & { times?: string[] }): string {
  const clean = cleanName(item);
  return JSON.stringify({
    key: clean.key,
    label: clean.label,
    label_ru: clean.label_ru ?? '',
    label_en: clean.label_en ?? '',
    times: item.times ? sortUniqueTimes(item.times) : undefined,
  });
}

function diffNamed(
  before: readonly (TranslatedName & { times?: string[] })[],
  after: readonly (TranslatedName & { times?: string[] })[],
  kinds: { added: ChangeKind; removed: ChangeKind; changed: ChangeKind; reordered: ChangeKind },
): BookingChange[] {
  const changes: BookingChange[] = [];
  const beforeByKey = new Map(before.map((item) => [item.key, item]));
  const afterByKey = new Map(after.map((item) => [item.key, item]));
  for (const item of after) {
    const old = beforeByKey.get(item.key);
    if (!old) changes.push({ kind: kinds.added, name: item.label.trim() });
    else if (canonicalNamed(old) !== canonicalNamed(item)) changes.push({ kind: kinds.changed, name: item.label.trim() });
  }
  for (const item of before) {
    if (!afterByKey.has(item.key)) changes.push({ kind: kinds.removed, name: item.label.trim() });
  }
  // Tartib: ikkala tomonda bor kalitlarning nisbiy tartibi o'zgargan bo'lsa
  const common = (list: readonly TranslatedName[], other: Map<string, unknown>) => list.filter((item) => other.has(item.key)).map((item) => item.key);
  if (common(before, afterByKey).join('\u0000') !== common(after, beforeByKey).join('\u0000')) changes.push({ kind: kinds.reordered });
  return changes;
}

/** Saqlangan va tahrirdagi sozlama o'rtasidagi farq (bo'sh ro'yxat = o'zgarish yo'q). Bo'sh joylar va tarjimadagi bo'sh matn farq emas. */
export function diffBooking(saved: BookingConfig, draft: BookingConfig): BookingChange[] {
  const changes: BookingChange[] = [];
  if (saved.enabled !== draft.enabled) changes.push({ kind: 'enabled' });
  changes.push(...diffNamed(saved.slots, draft.slots, { added: 'group_added', removed: 'group_removed', changed: 'group_changed', reordered: 'groups_reordered' }));
  changes.push(...diffNamed(saved.event_types, draft.event_types, { added: 'type_added', removed: 'type_removed', changed: 'type_changed', reordered: 'types_reordered' }));
  if (saved.duration_minutes !== draft.duration_minutes) changes.push({ kind: 'duration' });
  if (saved.max_days_ahead !== draft.max_days_ahead) changes.push({ kind: 'max_days' });
  if (saved.min_notice_minutes !== draft.min_notice_minutes) changes.push({ kind: 'min_notice' });
  if (saved.auto_confirm !== draft.auto_confirm) changes.push({ kind: 'auto_confirm' });
  if (normalizeWeekdays(saved.closed_weekdays).join(',') !== normalizeWeekdays(draft.closed_weekdays).join(',')) changes.push({ kind: 'closed_weekdays' });
  return changes;
}

export const isBookingDirty = (saved: BookingConfig, draft: BookingConfig): boolean => diffBooking(saved, draft).length > 0;
