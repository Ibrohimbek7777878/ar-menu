/**
 * <model-viewer> veb-komponentini kerak bo'lgandagina yuklaydi (TZ: R8-3).
 *
 * Avval u faqat bitta shablonda CDN'dan (unpkg, SRI'siz) yuklanardi, qolgan 10 shablonda umuman yo'q edi — 3D oyna
 * bo'sh chiqardi. Endi paket npm'dan (versiya qotirilgan), alohida kichik bo'lak sifatida: 3D oynasi ochilmaguncha
 * hech narsa yuklanmaydi.
 */
let loading: Promise<void> | null = null;

export function loadModelViewer(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.customElements?.get('model-viewer')) return Promise.resolve();   // shablon allaqachon yuklagan bo'lsa
  if (!loading) {
    loading = import('@google/model-viewer').then(() => undefined).catch((err) => {
      loading = null;       // keyingi urinishda qayta uriniladi
      console.warn('[3D] model-viewer yuklanmadi', err);
    });
  }
  return loading;
}
