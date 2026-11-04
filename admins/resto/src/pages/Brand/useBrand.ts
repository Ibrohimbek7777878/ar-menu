import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyBusinessPreset, deleteBrandImage, fetchBrand, saveBrand, uploadBrandImage } from './api';
import { buildPatch, mergePresetResult, stripBrandPrefix, validateBrand } from './brandModel';
import type { BrandIssue } from './brandModel';
import { readFailure } from '../Bookings/errors';
import type { ApiFailure } from '../Bookings/errors';
import type { Brand, BusinessType, ImageKind } from './types';

export interface ServerIssue {
  /** "hero.title" kabi yo'l ("brand." prefiksisiz); bo'sh = maydon ko'rsatilmagan */
  path: string;
  message: string;
}

export type SaveResult = { status: 'saved'; brand: Brand } | { status: 'invalid' } | { status: 'failed'; failure: ApiFailure };
export type ActionResult<T = void> = { status: 'done'; value: T } | { status: 'failed'; failure: ApiFailure };

/**
 * Til almashganda sahifa daraxti qayta ulanadi (LangBoundary) va hook holati yo'qoladi. Saqlanmagan tahrir yo'qolmasligi uchun
 * qoralama modul darajasida saqlanadi; u faqat serverdagi brend o'zgarmagan bo'lsa (`base`) tiklanadi.
 */
let stash: { base: string; draft: Brand } | null = null;

export function clearBrandDraftStash(): void {
  stash = null;
}

const snapshot = (brand: Brand): string => JSON.stringify(brand);

/** Brend sozlamalari: serverdagi (saved) va tahrirdagi (draft) nusxa, farq, tekshiruv va amallar. */
export function useBrand() {
  const [saved, setSaved] = useState<Brand | null>(null);
  const [draft, setDraft] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverIssue, setServerIssue] = useState<ServerIssue | null>(null);
  /** "Saqlash" bosilgan: shundan keyingina mijoz tekshiruvi xatolari ko'rsatiladi (yozayotganda qizarib ketmasin) */
  const [submitted, setSubmitted] = useState(false);
  const savedRef = useRef<Brand | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailure(null);
    try {
      const brand = await fetchBrand();
      if (!brand) {
        setLoadFailure({ status: 0, message: '', field: '', code: 'no_brand', slotTaken: false, forbidden: false });
        return;
      }
      savedRef.current = brand;
      setSaved(brand);
      const restored = stash && stash.base === snapshot(brand) ? stash.draft : null;
      setDraft(restored ?? brand);
    } catch (err: unknown) {
      setLoadFailure(readFailure(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tahrirdagi nusxani o'zgartiradi (`update` — brandModel.ts dagi o'zgarmas amallar). */
  const edit = useCallback((update: (current: Brand) => Brand) => {
    setServerIssue(null);
    setDraft((current) => {
      if (!current) return current;
      const next = update(current);
      if (next !== current && savedRef.current) stash = { base: snapshot(savedRef.current), draft: next };
      return next;
    });
  }, []);

  const diff = useMemo(() => (saved && draft ? buildPatch(saved, draft) : { patch: {}, paths: [] as string[] }), [saved, draft]);
  const issues: BrandIssue[] = useMemo(() => (draft ? validateBrand(draft, saved) : []), [draft, saved]);

  const discard = useCallback(() => {
    clearBrandDraftStash();
    setServerIssue(null);
    setSubmitted(false);
    setDraft(savedRef.current);
  }, []);

  const save = useCallback(async (): Promise<SaveResult> => {
    if (!saved || !draft) return { status: 'invalid' };
    setSubmitted(true);
    if (validateBrand(draft, saved).length > 0) return { status: 'invalid' };
    const { patch } = buildPatch(saved, draft);
    if (Object.keys(patch).length === 0) return { status: 'invalid' };
    setSaving(true);
    setServerIssue(null);
    try {
      const next = await saveBrand(patch);
      if (!next) throw new Error('');
      clearBrandDraftStash();
      savedRef.current = next;
      setSaved(next);
      setDraft(next);
      setSubmitted(false);
      return { status: 'saved', brand: next };
    } catch (err: unknown) {
      const failure = readFailure(err);
      if (failure.field) setServerIssue({ path: stripBrandPrefix(failure.field), message: failure.message });
      return { status: 'failed', failure };
    } finally {
      setSaving(false);
    }
  }, [saved, draft]);

  /** Logotip/favicon manzilini saqlangan va tahrirdagi nusxalarga bir vaqtda qo'yadi (rasm alohida so'rov bilan darrov saqlanadi) */
  const setImageUrl = useCallback((kind: ImageKind, url: string | null) => {
    const key = kind === 'logo' ? 'logo_url' : 'favicon_url';
    const apply = (brand: Brand): Brand => ({ ...brand, [key]: url });
    if (savedRef.current) {
      savedRef.current = apply(savedRef.current);
      setSaved(savedRef.current);
    }
    setDraft((current) => (current ? apply(current) : current));
    if (stash && savedRef.current) stash = { base: snapshot(savedRef.current), draft: apply(stash.draft) };
  }, []);

  const uploadImage = useCallback(
    async (kind: ImageKind, file: File): Promise<ActionResult<string | null>> => {
      try {
        const url = await uploadBrandImage(kind, file);
        setImageUrl(kind, url);
        return { status: 'done', value: url };
      } catch (err: unknown) {
        return { status: 'failed', failure: readFailure(err) };
      }
    },
    [setImageUrl],
  );

  const removeImage = useCallback(
    async (kind: ImageKind): Promise<ActionResult> => {
      try {
        await deleteBrandImage(kind);
        setImageUrl(kind, null);
        return { status: 'done', value: undefined };
      } catch (err: unknown) {
        return { status: 'failed', failure: readFailure(err) };
      }
    },
    [setImageUrl],
  );

  /** Shablonni qo'llash (serverda darrov saqlanadi). Saqlanmagan boshqa tahrirlar qoladi. */
  const applyPreset = useCallback(async (businessType: BusinessType): Promise<ActionResult> => {
    try {
      const applied = await applyBusinessPreset(businessType);
      if (!applied) throw new Error('');
      // Server javobi — yangi "saqlangan" holat; tahrirdagi nusxada esa shablon qismlari yangilanadi, qolgan tahrirlar qoladi
      savedRef.current = applied;
      setSaved(applied);
      setDraft((draftNow) => (draftNow ? mergePresetResult(draftNow, applied) : applied));
      clearBrandDraftStash();
      return { status: 'done', value: undefined };
    } catch (err: unknown) {
      return { status: 'failed', failure: readFailure(err) };
    }
  }, []);

  return {
    saved,
    draft,
    loading,
    loadFailure,
    saving,
    submitted,
    serverIssue,
    paths: diff.paths,
    dirty: diff.paths.length > 0,
    issues,
    reload: load,
    edit,
    discard,
    save,
    uploadImage,
    removeImage,
    applyPreset,
  };
}
