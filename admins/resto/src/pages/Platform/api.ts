import { apiClient } from '@admins/shared';
import { tenantsFromResponse } from './tenants';
import type { Tenant } from './tenants';
import { TENANTS_URL, checkSubdomainUrl, resetOwnerPasswordUrl, tenantUrl } from './urls';

export async function fetchTenants(): Promise<Tenant[]> {
  return tenantsFromResponse(await apiClient<unknown>(TENANTS_URL));
}

export interface SubdomainCheck {
  available: boolean;
  /** Server normallashtirgan nom (bo'sh bo'lishi mumkin) */
  normalized: string;
  /** Band bo'lsa sababi (server matni, o'zbekcha); bo'lmasa bo'sh */
  reason: string;
}

/** Subdomen bandmi? `GET check-subdomain/?q=`. Eskirgan so'rovni to'xtatish uchun `signal`. */
export async function checkSubdomain(query: string, signal?: AbortSignal): Promise<SubdomainCheck> {
  const raw = await apiClient<Record<string, unknown>>(checkSubdomainUrl(query), { signal });
  return {
    available: raw.available === true,
    normalized: typeof raw.normalized === 'string' ? raw.normalized : '',
    reason: typeof raw.reason === 'string' ? raw.reason : '',
  };
}

export interface CreateTenantPayload {
  name: string;
  subdomain: string;
  business_type: string;
  owner_username: string;
  owner_password?: string;
  phone?: string;
}

export interface CreatedTenant {
  id: string;
  subdomain: string;
  url: string;
  login_url: string;
  owner_username: string;
  /** Faqat parol bermagan bo'lsak (server o'zi yaratgan); bir marta ko'rsatiladi */
  generated_password: string;
}

export async function createTenant(payload: CreateTenantPayload): Promise<CreatedTenant> {
  const raw = await apiClient<Record<string, unknown>>(TENANTS_URL, { method: 'POST', body: JSON.stringify(payload) });
  const text = (value: unknown): string => (typeof value === 'string' ? value : '');
  return {
    id: typeof raw.id === 'number' || typeof raw.id === 'string' ? String(raw.id) : '',
    subdomain: text(raw.subdomain),
    url: text(raw.url),
    login_url: text(raw.login_url),
    owner_username: text(raw.owner_username),
    generated_password: text(raw.generated_password),
  };
}

export interface TenantPatch {
  name?: string;
  business_type?: string;
  status?: string;
}

/** Faqat o'zgargan maydonlar yuboriladi. Subdomen o'zgarmaydi. */
export async function updateTenant(id: string, patch: TenantPatch): Promise<void> {
  await apiClient<unknown>(tenantUrl(id), { method: 'PATCH', body: JSON.stringify(patch) });
}

/** Ega parolini tiklash: yangi bir martalik parol (serverda ochiq saqlanmaydi) */
export async function resetOwnerPassword(id: string): Promise<string> {
  const raw = await apiClient<Record<string, unknown>>(resetOwnerPasswordUrl(id), { method: 'POST', body: JSON.stringify({}) });
  return typeof raw.generated_password === 'string' ? raw.generated_password : '';
}
