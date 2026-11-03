/**
 * Xodim ruxsatlari: SOF mantiq (React ham, tarmoq ham yo'q) — `node --test` bilan sinaladi. Bu fayl hech narsa import qilmaydi.
 *
 * Model (server bilan shartnoma):
 *   samarali ruxsatlar = (rol standarti + QO'SHIMCHA) − OLIB TASHLANGAN
 *   - rol standartida bor ruxsatni o'chirish  -> "olib tashlangan" (revoked) ga;
 *   - rol standartida yo'q ruxsatni yoqish    -> "qo'shimcha" (extra) ga;
 *   - rol standartiga qaytish                 -> ikkalasidan ham olib tashlanadi (ortiqcha yozuv saqlanmaydi).
 * Server javobidagi `permissions` — haqiqat; bu yerda faqat tahrirlash paytidagi qoralama hisoblanadi.
 */

export interface CatalogItem {
  key: string;
  label: string;
  group: string;
  description: string;
  /** Pul yoki xodim ma'lumotiga ruxsat: faqat restoran egasi bera/olib tashlay oladi. */
  sensitive: boolean;
}

export interface Catalog {
  items: CatalogItem[];
  /** Rol -> standart ruxsat kalitlari. */
  roleDefaults: Record<string, string[]>;
  /** Hozirgi foydalanuvchi boshqalarga bera oladigan kalitlar (server hisoblaydi); `null` — server bermadi. */
  grantable: string[] | null;
  /** Hozirgi foydalanuvchi restoran egasi (cheklovsiz); `null` — server bermadi. */
  isOwner: boolean | null;
}

export interface Overrides {
  /** Rol standartiga qo'shimcha berilganlar. */
  extra: string[];
  /** Rol standartidan olib tashlanganlar. */
  revoked: string[];
}

/** Ruxsatning xodimdagi holati: rol bo'yicha bor / qo'shimcha berilgan / olib tashlangan / yo'q. */
export type PermState = 'role' | 'extra' | 'revoked' | 'none';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Matn kalitlari: faqat bo'sh bo'lmagan satrlar, bo'sh joylari kesilgan, takrorlari olib tashlangan (tartib saqlanadi). */
export function uniqueKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    if (typeof raw !== 'string') continue;
    const key = raw.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Server katalogini xavfsiz shaklga keltiradi (buzuq elementlar tashlanadi, takror kalit birinchisi qoladi). */
export function normalizeCatalog(raw: unknown): Catalog {
  const source = isRecord(raw) ? raw : {};
  const items: CatalogItem[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(source.capabilities) ? source.capabilities : [];
  for (const entry of list) {
    if (!isRecord(entry)) continue;
    const key = typeof entry.key === 'string' ? entry.key.trim() : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : key,
      group: typeof entry.group === 'string' ? entry.group.trim() : '',
      description: typeof entry.description === 'string' ? entry.description.trim() : '',
      sensitive: entry.sensitive === true,
    });
  }
  const roleDefaults: Record<string, string[]> = {};
  if (isRecord(source.role_defaults)) {
    for (const [role, keys] of Object.entries(source.role_defaults)) roleDefaults[role] = uniqueKeys(keys);
  }
  return {
    items,
    roleDefaults,
    grantable: Array.isArray(source.grantable) ? uniqueKeys(source.grantable) : null,
    isOwner: typeof source.is_owner === 'boolean' ? source.is_owner : null,
  };
}

export function knownKeySet(catalog: Catalog): Set<string> {
  return new Set(catalog.items.map((item) => item.key));
}

/** Faqat katalogda bor kalitlar (noma'lum kalit ko'rsatilmaydi va PATCH'ga ketmaydi). */
export function onlyKnown(keys: readonly string[], known: ReadonlySet<string>): string[] {
  return uniqueKeys(keys).filter((key) => known.has(key));
}

/**
 * Qoralamani toza holatga keltiradi:
 *   extra   = extra − standart − olib tashlanganlar   (standartda borini "qo'shimcha" deb yozmaymiz)
 *   revoked = revoked ∩ standart                       (standartda yo'q narsani "olib tashlash" ma'nosiz)
 * Bir kalit ikkala ro'yxatda bo'lsa, server formulasi (standart + extra − revoked) bo'yicha "olib tashlangan" yutadi.
 * `known` berilsa, noma'lum kalitlar tushib qoladi.
 */
export function tidyOverrides(overrides: Overrides, defaults: readonly string[], known?: ReadonlySet<string>): Overrides {
  const base = new Set(uniqueKeys(defaults));
  const revokedAll = new Set(uniqueKeys(overrides.revoked));
  const keep = (key: string) => !known || known.has(key);
  return {
    extra: uniqueKeys(overrides.extra).filter((key) => !base.has(key) && !revokedAll.has(key) && keep(key)),
    revoked: uniqueKeys(overrides.revoked).filter((key) => base.has(key) && keep(key)),
  };
}

export function permissionState(key: string, defaults: readonly string[], overrides: Overrides): PermState {
  const inDefaults = defaults.includes(key);
  if (overrides.revoked.includes(key)) return inDefaults ? 'revoked' : 'none';
  if (inDefaults) return 'role';
  return overrides.extra.includes(key) ? 'extra' : 'none';
}

export function isOn(state: PermState): boolean {
  return state === 'role' || state === 'extra';
}

/** Samarali ruxsatlar: (standart + extra) − revoked. Tartib: avval standart, keyin qo'shimcha. */
export function computeEffective(defaults: readonly string[], overrides: Overrides): string[] {
  const revoked = new Set(overrides.revoked);
  return uniqueKeys([...defaults, ...overrides.extra]).filter((key) => !revoked.has(key));
}

/** Bitta ruxsatni yoqish/o'chirish (yuqoridagi qoida bo'yicha). Kirish obyektini o'zgartirmaydi. */
export function setPermission(key: string, on: boolean, defaults: readonly string[], overrides: Overrides): Overrides {
  const inDefaults = defaults.includes(key);
  const extra = overrides.extra.filter((k) => k !== key);
  const revoked = overrides.revoked.filter((k) => k !== key);
  if (on && !inDefaults) extra.push(key);
  if (!on && inDefaults) revoked.push(key);
  return { extra, revoked };
}

/** "Rol standartiga qaytarish": hamma qo'shimcha va olib tashlanganlar tozalanadi. */
export function resetOverrides(): Overrides {
  return { extra: [], revoked: [] };
}

/** Ro'yxat kartasi uchun: nechta qo'shimcha berilgan / olib tashlangan (server `permissions` bermasa yoki buzuq bo'lsa 0). */
export function overrideCounts(permissions: unknown): { extra: number; revoked: number } {
  if (!isRecord(permissions)) return { extra: 0, revoked: 0 };
  return { extra: uniqueKeys(permissions.extra).length, revoked: uniqueKeys(permissions.revoked).length };
}

export function hasOverrides(overrides: Overrides): boolean {
  return overrides.extra.length > 0 || overrides.revoked.length > 0;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size !== right.size) return false;
  for (const key of left) if (!right.has(key)) return false;
  return true;
}

/** Tartib va takrorga qaramasdan tenglik. */
export function overridesEqual(a: Overrides, b: Overrides): boolean {
  return sameSet(a.extra, b.extra) && sameSet(a.revoked, b.revoked);
}

/**
 * Xodimning ruxsat qoralamasi uchun rol standarti:
 *  - rol saqlangan rol bilan bir xil bo'lsa — serverning o'zi bergan `role_defaults` (haqiqat), bo'lmasa katalogdagi;
 *  - boshqa rol tanlangan bo'lsa — katalogdagi shu rol standarti; katalogda bo'lmagan rol uchun bo'sh ro'yxat.
 */
export function defaultsForRole(
  role: string,
  savedRole: string,
  savedDefaults: readonly string[] | null | undefined,
  catalog: Catalog,
): string[] {
  if (role === savedRole && savedDefaults) return uniqueKeys([...savedDefaults]);
  return [...(catalog.roleDefaults[role] ?? [])];
}

export interface PermissionGroup {
  group: string;
  items: CatalogItem[];
}

/** Guruhlar katalogdagi birinchi uchrashish tartibida; guruhsiz ruxsatlar ('') oxirgi guruhga. */
export function groupItems(items: readonly CatalogItem[]): PermissionGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const group = item.group;
    if (!byGroup.has(group)) {
      byGroup.set(group, []);
      order.push(group);
    }
    byGroup.get(group)!.push(item);
  }
  const named = order.filter((g) => g !== '');
  const result = named.map((group) => ({ group, items: byGroup.get(group)! }));
  if (byGroup.has('')) result.push({ group: '', items: byGroup.get('')! });
  return result;
}

// ─── Kim nimani o'zgartira oladi ───

export type LockReason = 'sensitive' | 'not_owned';

export interface GrantContext {
  /** Tahrirlayotgan odam restoran egasi (yoki super_admin): cheklov yo'q. */
  actorUnlimited: boolean;
  /** Tahrirlayotgan odam boshqaga bera oladigan kalitlar; `null` — noma'lum (nozik bo'lmaganni cheklamaymiz, qarorni server qiladi). */
  grantable: ReadonlySet<string> | null;
}

/**
 * Ruxsat almashtirgichi qulflanishi sababi (yoki `null` — erkin). Server qoidasi bilan bir xil: faqat YANGI BERILADIGAN ruxsat
 * tekshiriladi (samarali ruxsatlardagi o'sish), olib tashlash doim mumkin:
 *  - hozir yoqilgan yoki saqlangan holatda yoqilgan edi (qaytarib yoqish yangi ruxsat emas) -> erkin;
 *  - "sensitive": pul/xodim/sozlama ruxsatini faqat egasi beradi;
 *  - "not_owned": o'zida yo'q ruxsatni boshqaga berib bo'lmaydi.
 */
export function lockReason(
  item: Pick<CatalogItem, 'key' | 'sensitive'>,
  context: GrantContext,
  state: { currentlyOn: boolean; wasOn: boolean },
): LockReason | null {
  if (context.actorUnlimited) return null;
  if (state.currentlyOn || state.wasOn) return null;
  if (item.sensitive) return 'sensitive';
  if (context.grantable && !context.grantable.has(item.key)) return 'not_owned';
  return null;
}

/** Egasi/super_admin bo'lmagan xodim egasi yoki menejerning (o'zidan boshqa) profilini umuman o'zgartira olmaydi (server 403). */
export type ProfileLock = 'managed_by_owner';

export function profileLock(args: { actorUnlimited: boolean; isSelf: boolean; targetRole: string }): ProfileLock | null {
  if (args.actorUnlimited || args.isSelf) return null;
  return args.targetRole === 'shop_owner' || args.targetRole === 'super_admin' || args.targetRole === 'shop_manager'
    ? 'managed_by_owner'
    : null;
}

const BASE_ROLES = ['waiter', 'kitchen', 'hostess', 'shop_manager'] as const;

/**
 * Rol tanlovidagi variantlar (server `CREATABLE_ROLES` bilan mos). Menejer boshqaga "menejer" rolini bera olmaydi (server 403 qaytaradi),
 * shuning uchun unga bu variant ko'rsatilmaydi (xodimda hozir shu rol bo'lsa, tanlov yolg'on ko'rsatmasligi uchun qoladi).
 * Egasi/super_admin rolidagi xodimda hozirgi rol o'zi ham ro'yxatga qo'shiladi (tanlov uni to'g'ri ko'rsatsin).
 */
export function assignableRoles(actorRole: string, currentRole: string): string[] {
  const roles: string[] = BASE_ROLES.filter((role) => !(actorRole === 'shop_manager' && role === 'shop_manager' && currentRole !== 'shop_manager'));
  if (!roles.includes(currentRole)) roles.push(currentRole);
  return roles;
}

/** Ikki kalit ro'yxati bir xil to'plammi (tartib va takror e'tiborsiz). */
export function sameKeySet(a: readonly string[], b: readonly string[]): boolean {
  return sameSet(a, b);
}

export type ReadonlyReason = 'owner' | 'self' | 'no_access' | 'other';

/** Nega ruxsatlar faqat o'qish uchun (`editable_permissions=false`). */
export function readonlyReason(args: { targetRole: string; isSelf: boolean; actorHasStaffAccess: boolean }): ReadonlyReason {
  if (args.targetRole === 'shop_owner' || args.targetRole === 'super_admin') return 'owner';
  if (args.isSelf) return 'self';
  if (!args.actorHasStaffAccess) return 'no_access';
  return 'other';
}

// ─── "Bu xodim nimani ko'radi" ───

export interface AccessSummaryGroup {
  group: string;
  labels: string[];
}

export interface AccessSummary {
  total: number;
  groups: AccessSummaryGroup[];
}

/** Samarali ruxsatlardan guruh -> ruxsat nomlari ro'yxati (katalog tartibida; katalogda yo'q kalit sanalmaydi). */
export function summarizeAccess(items: readonly CatalogItem[], effective: readonly string[]): AccessSummary {
  const on = new Set(effective);
  const groups: AccessSummaryGroup[] = [];
  let total = 0;
  for (const { group, items: members } of groupItems(items)) {
    const labels = members.filter((item) => on.has(item.key)).map((item) => item.label);
    if (labels.length === 0) continue;
    total += labels.length;
    groups.push({ group, labels });
  }
  return { total, groups };
}

// ─── Saqlash ───

export interface RolePermissionsDraft {
  role: string;
  overrides: Overrides;
}

export interface RolePermissionsPatch {
  role?: string;
  extra_capabilities?: string[];
  revoked_capabilities?: string[];
}

/**
 * Saqlangan holat bilan qoralama farqi: faqat o'zgargan maydonlar.
 * Ruxsatlar o'zgargan bo'lsa, ikkala ro'yxat birga ketadi (server bir butun holatni oladi). `canEditPermissions=false`
 * bo'lsa (egasi, o'zi, huquqsiz) ruxsat maydonlari HECH QACHON yuborilmaydi.
 */
export function buildPermissionsPatch(
  saved: RolePermissionsDraft,
  draft: RolePermissionsDraft,
  canEditPermissions: boolean,
): RolePermissionsPatch {
  const patch: RolePermissionsPatch = {};
  if (draft.role !== saved.role) patch.role = draft.role;
  if (canEditPermissions && !overridesEqual(saved.overrides, draft.overrides)) {
    patch.extra_capabilities = uniqueKeys(draft.overrides.extra);
    patch.revoked_capabilities = uniqueKeys(draft.overrides.revoked);
  }
  return patch;
}
