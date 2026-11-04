import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { putHotspots, putStops } from './api';
import {
  baseSignature,
  diffHotspots,
  diffStops,
  draftHotspotsFromTour,
  draftStopsFromTour,
  hotspotsPayload,
  isDirtyDiff,
  stopsPayload,
  sumDiff,
  validateDraft,
} from './editModel';
import type { DraftIssue, ListDiff } from './editModel';
import { readFailure } from '../Bookings/errors';
import type { ApiFailure } from '../Bookings/errors';
import type { DraftHotspot, DraftStop, Tour } from './types';

interface Draft {
  stops: DraftStop[];
  hotspots: DraftHotspot[];
}

/**
 * Til almashganda sahifa daraxti qayta ulanadi (LangBoundary) va hook holati yo'qoladi. Saqlanmagan tahrir yo'qolmasligi uchun
 * qoralama modul darajasida saqlanadi; u faqat serverdagi holat o'zgarmagan bo'lsa (`base`) tiklanadi.
 */
let stash: { tourId: number; base: string; draft: Draft } | null = null;

export function clearDraftStash(): void {
  stash = null;
}

export type SaveResult =
  | { status: 'saved'; tour: Tour }
  | { status: 'invalid' }
  | { status: 'failed'; failure: ApiFailure; /** Nuqtalar saqlandi, belgilar saqlanmadi */ stopsSaved: boolean; tour: Tour };

/** Muharrir qoralamasi: nuqtalar va belgilar, serverdagi nusxadan farqi, tekshiruv, saqlash. */
export function useEditorDraft(tour: Tour, apply: (next: Tour) => void) {
  const baseStops = useMemo(() => draftStopsFromTour(tour.stops), [tour.stops]);
  const baseHotspots = useMemo(() => draftHotspotsFromTour(tour.hotspots), [tour.hotspots]);

  const [draft, setDraft] = useState<Draft>(() => {
    const base = baseSignature(baseStops, baseHotspots);
    return stash && stash.tourId === tour.id && stash.base === base ? stash.draft : { stops: baseStops, hotspots: baseHotspots };
  });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const stopsDiff: ListDiff = useMemo(() => diffStops(baseStops, draft.stops), [baseStops, draft.stops]);
  const hotspotsDiff: ListDiff = useMemo(() => diffHotspots(baseHotspots, draft.hotspots), [baseHotspots, draft.hotspots]);
  const dirty = isDirtyDiff(stopsDiff) || isDirtyDiff(hotspotsDiff);
  const changeCount = sumDiff(stopsDiff, hotspotsDiff);
  const issues: DraftIssue[] = useMemo(() => validateDraft(draft.stops, draft.hotspots, tour.duration_s), [draft, tour.duration_s]);

  // Qoralama zaxirasi (til almashganda tiklash uchun)
  useEffect(() => {
    if (dirty) stash = { tourId: tour.id, base: baseSignature(baseStops, baseHotspots), draft };
    else if (stash?.tourId === tour.id) stash = null;
  }, [dirty, draft, tour.id, baseStops, baseHotspots]);

  /** Saqlash paytida tahrir qabul qilinmaydi: javob kelganda qoralama bosib ketilmasin */
  const editStops = useCallback((update: (current: DraftStop[]) => DraftStop[]) => {
    if (savingRef.current) return;
    setDraft((current) => {
      const next = update(current.stops);
      return next === current.stops ? current : { ...current, stops: next };
    });
  }, []);

  const editHotspots = useCallback((update: (current: DraftHotspot[]) => DraftHotspot[]) => {
    if (savingRef.current) return;
    setDraft((current) => {
      const next = update(current.hotspots);
      return next === current.hotspots ? current : { ...current, hotspots: next };
    });
  }, []);

  const discard = useCallback(() => {
    if (savingRef.current) return;
    stash = null;
    setDraft({ stops: baseStops, hotspots: baseHotspots });
  }, [baseStops, baseHotspots]);

  /** Saqlash: avval nuqtalar, keyin belgilar (har biri to'liq almashtiriladi). Faqat o'zgargani yuboriladi. */
  const save = useCallback(async (): Promise<SaveResult> => {
    if (savingRef.current) return { status: 'invalid' };
    const current = draftRef.current;
    if (validateDraft(current.stops, current.hotspots, tour.duration_s).length > 0) return { status: 'invalid' };
    savingRef.current = true;
    setSaving(true);
    let latest = tour;
    let stopsSaved = false;
    try {
      if (isDirtyDiff(diffStops(baseStops, current.stops))) {
        latest = await putStops(tour.id, stopsPayload(current.stops));
        stopsSaved = true;
        apply(latest);
        setDraft((d) => ({ ...d, stops: draftStopsFromTour(latest.stops) }));
      }
      if (isDirtyDiff(diffHotspots(baseHotspots, current.hotspots))) {
        latest = await putHotspots(tour.id, hotspotsPayload(current.hotspots));
        apply(latest);
        setDraft((d) => ({ ...d, hotspots: draftHotspotsFromTour(latest.hotspots) }));
      }
      stash = null;
      return { status: 'saved', tour: latest };
    } catch (err: unknown) {
      return { status: 'failed', failure: readFailure(err), stopsSaved, tour: latest };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [tour, baseStops, baseHotspots, apply]);

  return { stops: draft.stops, hotspots: draft.hotspots, saving, dirty, changeCount, stopsDiff, hotspotsDiff, issues, editStops, editHotspots, discard, save };
}
