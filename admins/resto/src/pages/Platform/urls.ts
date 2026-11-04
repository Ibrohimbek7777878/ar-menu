/** Platforma API manzillari (BR1 shartnomasi; faqat super_admin, platforma hostida). SOF mantiq. */
export const TENANTS_URL = '/api/platform/v1/tenants/';

/** `GET tenants/check-subdomain/?q=` — so'rov matni kodlanadi */
export const checkSubdomainUrl = (query: string): string => `${TENANTS_URL}check-subdomain/?q=${encodeURIComponent(String(query ?? ''))}`;

export const tenantUrl = (id: string | number): string => `${TENANTS_URL}${encodeURIComponent(String(id))}/`;

export const resetOwnerPasswordUrl = (id: string | number): string => `${tenantUrl(id)}reset-owner-password/`;
