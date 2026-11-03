import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBookingSettings, saveBookingSettings } from './api';
import { readFailure } from './errors';
import type { ApiFailure } from './errors';
import { cleanForSave, diffBooking, presetBooking, stripBookingPrefix, validateBooking } from './settingsModel';
import type { BookingChange, BookingIssue } from './settingsModel';
import type { BookingConfig } from './types';

export interface ServerIssue {
  /** `slots[1].times[0]` kabi yo'l ("booking." prefiksisiz); bo'sh = maydon ko'rsatilmagan */
  path: string;
  message: string;
}

export type SaveResult = { status: 'saved' } | { status: 'invalid' } | { status: 'failed'; failure: ApiFailure };

/**
 * Til almashganda sahifa daraxti qayta ulanadi (LangBoundary) va hook holati yo'qoladi. Saqlanmagan tahrir yo'qolmasligi uchun
 * qoralama modul darajasida saqlanadi; u faqat serverdagi sozlama o'zgarmagan bo'lsa (`base`) tiklanadi.
 */
let stash: { base: string; draft: BookingConfig } | null = null;

export function clearBookingDraftStash(): void {
  stash = null;
}

const snapshot = (config: BookingConfig): string => JSON.stringify(cleanForSave(config));

/** Bron sozlamalari: serverdagi (saved) va tahrirdagi (draft) nusxa, tekshiruv, farq va saqlash. */
export function useBookingSettings() {
  const [saved, setSaved] = useState<BookingConfig | null>(null);
  const [draft, setDraft] = useState<BookingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverIssue, setServerIssue] = useState<ServerIssue | null>(null);
  /** "Saqlash" bosilgan: shundan keyingina tekshiruv xatolari ko'rsatiladi (yangi guruh qo'shilganda darrov qizarib ketmasin) */
  const [submitted, setSubmitted] = useState(false);
  const savedRef = useRef<BookingConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailure(null);
    try {
      const config = await fetchBookingSettings();
      savedRef.current = config;
      setSaved(config);
      const restored = stash && stash.base === snapshot(config) ? stash.draft : null;
      setDraft(restored ?? config);
    } catch (err: unknown) {
      setLoadFailure(readFailure(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Tahrirdagi nusxani o'zgartiradi (`update` — settingsModel.ts dagi o'zgarmas amallardan biri). */
  const edit = useCallback((update: (current: BookingConfig) => BookingConfig) => {
    setServerIssue(null);
    setDraft((current) => {
      if (!current) return current;
      const next = update(current);
      if (next !== current && savedRef.current) stash = { base: snapshot(savedRef.current), draft: next };
      return next;
    });
  }, []);

  const discard = useCallback(() => {
    clearBookingDraftStash();
    setServerIssue(null);
    setSubmitted(false);
    setDraft(savedRef.current);
  }, []);

  /** Tayyor andozani QORALAMAga qo'yadi (saqlanmaguncha server o'zgarmaydi). */
  const applyPreset = useCallback(() => edit((current) => presetBooking(current)), [edit]);

  const changes: BookingChange[] = useMemo(() => (saved && draft ? diffBooking(saved, draft) : []), [saved, draft]);
  const issues: BookingIssue[] = useMemo(() => (draft ? validateBooking(draft) : []), [draft]);

  const save = useCallback(async (): Promise<SaveResult> => {
    if (!draft) return { status: 'invalid' };
    setSubmitted(true);
    if (validateBooking(draft).length > 0) return { status: 'invalid' };
    setSaving(true);
    setServerIssue(null);
    try {
      const next = await saveBookingSettings(draft);
      clearBookingDraftStash();
      savedRef.current = next;
      setSaved(next);
      setDraft(next);
      setSubmitted(false);
      return { status: 'saved' };
    } catch (err: unknown) {
      const failure = readFailure(err);
      if (failure.field) setServerIssue({ path: stripBookingPrefix(failure.field), message: failure.message });
      return { status: 'failed', failure };
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return {
    saved,
    draft,
    loading,
    loadFailure,
    saving,
    submitted,
    serverIssue,
    changes,
    dirty: changes.length > 0,
    issues,
    reload: load,
    edit,
    discard,
    applyPreset,
    save,
  };
}
