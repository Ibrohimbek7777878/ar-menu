import { apiClient } from '@admins/shared';
import { brandFromResponse, safeImageUrl } from './brandModel';
import type { Brand, BrandPatch, BusinessType, ImageKind } from './types';
import { BRAND_IMAGE_URL, BRAND_PRESET_URL, SETTINGS_URL } from './urls';

/** Brend sozlamalari: `GET settings/` ichidagi `brand`. Server hali `brand` bermasa — `null` (sahifa xato ko'rsatadi, jimgina standart emas). */
export async function fetchBrand(): Promise<Brand | null> {
  return brandFromResponse(await apiClient<unknown>(SETTINGS_URL));
}

/** Saqlash: `PATCH settings/ {brand: {...faqat o'zgargan kalitlar}}`. Javobdagi `brand` qaytariladi (server rangni to'qlashtirgan bo'lishi mumkin). */
export async function saveBrand(patch: BrandPatch): Promise<Brand | null> {
  const raw = await apiClient<unknown>(SETTINGS_URL, { method: 'PATCH', body: JSON.stringify({ brand: patch }) });
  return brandFromResponse(raw) ?? (await fetchBrand());
}

/** Logotip/favicon yuklash: multipart `image` + `kind` -> `{logo_url | favicon_url}`. Yangi manzil yoki `null`. */
export async function uploadBrandImage(kind: ImageKind, file: File): Promise<string | null> {
  const body = new FormData();
  body.append('image', file);
  body.append('kind', kind);
  const raw = await apiClient<Record<string, unknown>>(BRAND_IMAGE_URL, { method: 'POST', body });
  return safeImageUrl(raw[kind === 'logo' ? 'logo_url' : 'favicon_url']);
}

/** Rasmni olib tashlash: `DELETE` + `{kind}` */
export async function deleteBrandImage(kind: ImageKind): Promise<void> {
  await apiClient<unknown>(BRAND_IMAGE_URL, { method: 'DELETE', body: JSON.stringify({ kind }) });
}

/** Biznes turi shabloni: atamalar va bo'limlar standarti SERVERDA saqlanadi; yangilangan brend qaytadi. */
export async function applyBusinessPreset(businessType: BusinessType): Promise<Brand | null> {
  const raw = await apiClient<unknown>(BRAND_PRESET_URL, { method: 'POST', body: JSON.stringify({ business_type: businessType }) });
  return brandFromResponse(raw) ?? (await fetchBrand());
}
