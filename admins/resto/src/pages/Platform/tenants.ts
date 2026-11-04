/**
 * Mijozlar (tenantlar) ro'yxati: SOF mantiq (React ham, DOM ham yo'q) — `node --test` bilan sinaladi.
 * Shartnoma (BR1): `GET /api/platform/v1/tenants/` -> `{count, results:[{id,name,subdomain,business_type,status,owner_username,
 * created_at,tables,products,url}]}`.
 */

export type TenantStatus = 'active' | 'suspended';
export type StatusFilter = 'all' | TenantStatus;
export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'active', 'suspended'];

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  business_type: string;
  status: string;
  owner_username: string;
  created_at: string;
  tables: number;
  products: number;
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

/** Faqat http(s) havola (yangi oynada ochish uchun); `javascript:` va boshqalar rad etiladi */
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function normalizeTenant(raw: unknown): Tenant | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'number' || typeof raw.id === 'string' ? String(raw.id) : '';
  if (!id) return null;
  return {
    id,
    name: str(raw.name),
    subdomain: str(raw.subdomain),
    business_type: str(raw.business_type),
    status: str(raw.status),
    owner_username: str(raw.owner_username),
    created_at: str(raw.created_at),
    tables: count(raw.tables),
    products: count(raw.products),
    url: safeHttpUrl(raw.url),
  };
}

/** Javobdan ro'yxat: yaroqsiz elementlar tashlanadi, hech qachon xato tashlamaydi */
export function tenantsFromResponse(raw: unknown): Tenant[] {
  const list = isRecord(raw) && Array.isArray(raw.results) ? raw.results : Array.isArray(raw) ? raw : [];
  return list.map(normalizeTenant).filter((tenant): tenant is Tenant => tenant !== null);
}

export const isActive = (tenant: Pick<Tenant, 'status'>): boolean => tenant.status === 'active';
export const isSuspended = (tenant: Pick<Tenant, 'status'>): boolean => tenant.status === 'suspended';

/** Holat tugmasi bosilganda o'tadigan holat */
export const toggledStatus = (tenant: Pick<Tenant, 'status'>): TenantStatus => (isSuspended(tenant) ? 'active' : 'suspended');

/** Qidiruv (nom, subdomen, ega logini bo'yicha, katta-kichik harf farqsiz) va holat filtri */
export function filterTenants(list: readonly Tenant[], query: string, status: StatusFilter): Tenant[] {
  const needle = String(query ?? '').trim().toLowerCase();
  return list.filter((tenant) => {
    if (status !== 'all' && tenant.status !== status) return false;
    if (!needle) return true;
    return [tenant.name, tenant.subdomain, tenant.owner_username].some((field) => field.toLowerCase().includes(needle));
  });
}

/** Filtr chiplaridagi sonlar (qidiruvga bog'liq emas) */
export function statusCounts(list: readonly Tenant[]): Record<StatusFilter, number> {
  return { all: list.length, active: list.filter(isActive).length, suspended: list.filter(isSuspended).length };
}

/** "2026-11-03T08:15:00Z" -> "03.11.2026"; tushunarsiz bo'lsa bo'sh qator */
export function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}

/** Kirish sahifasi manzili (yaratish javobida server o'zi beradi; ro'yxatda faqat `url` bor): `<url>/admin/login/` */
export function loginUrlOf(url: string): string {
  const base = safeHttpUrl(url);
  if (!base) return '';
  return new URL('/admin/login/', base).toString();
}
