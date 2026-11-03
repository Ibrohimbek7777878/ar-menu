import { useCallback, useEffect, useRef, useState } from 'react';
import { restoUz } from '../../../i18n/uz';
import { pickImage, searchImages } from '../BulkImport/api';
import { extractFailure, failureKind } from '../BulkImport/errors';
import { choiceFromPick } from '../BulkImport/images';
import type { ImageChoice, ImageSearchResult } from '../BulkImport/types';
import { planAutoSearch, searchKey } from './autoSearch';

export type SuggestPhase = 'idle' | 'loading' | 'ready' | 'empty' | 'down' | 'limited';

interface View {
  phase: SuggestPhase;
  results: ImageSearchResult[];
  /** Qidirilgan so'z (sarlavhada ko'rsatiladi). */
  query: string;
}

const IDLE: View = { phase: 'idle', results: [], query: '' };

interface Options {
  name: string;
  hasImage: boolean;
  nameEdited: boolean;
  /** Qo'lda qidirish paneli ochiq: avtomatik takliflar yashiriladi. */
  suspended: boolean;
}

/**
 * Taom nomi yozilgach internetdan rasm takliflarini o'zi qidiradi. Qachon qidirish qoidasi `planAutoSearch` da (sof funksiya);
 * bu yerda faqat holat, soat (bitta kutish taymeri) va so'rovlar. So'rov xatolari tinch: qizil emas, "hozir ishlamayapti"
 * degan yumshoq yozuv, keyin avtomatik qidiruv shu forma uchun to'xtaydi (qo'lda tugma ishlayveradi).
 */
export function useAutoSearch({ name, hasImage, nameEdited, suspended }: Options) {
  const [view, setView] = useState<View>(IDLE);
  const [picking, setPicking] = useState<string[]>([]);
  const [pickFailed, setPickFailed] = useState(false);

  const nameRef = useRef(name);
  nameRef.current = name;
  const flagsRef = useRef({ hasImage, nameEdited, suspended });
  flagsRef.current = { hasImage, nameEdited, suspended };

  const lastEditAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const shownKeyRef = useRef<string | null>(null);
  const dismissedKeyRef = useRef<string | null>(null);
  const searchedKeysRef = useRef<Set<string>>(new Set());
  const newQueriesRef = useRef(0);
  const blockedRef = useRef(false);
  const pickSeqRef = useRef(0);
  const mountedRef = useRef(true);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    shownKeyRef.current = null;
    setView(IDLE);
  }, []);

  const run = useCallback(async (query: string, key: string, isNew: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    shownKeyRef.current = key;
    searchedKeysRef.current.add(key);
    if (isNew) newQueriesRef.current += 1;
    setPickFailed(false);
    setView({ phase: 'loading', results: [], query });
    try {
      const response = await searchImages(query, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setView({ phase: response.results.length > 0 ? 'ready' : 'empty', results: response.results, query });
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) return;
      blockedRef.current = true;
      const limited = failureKind(extractFailure(error)) === 'rate_limited';
      setView({ phase: limited ? 'limited' : 'down', results: [], query });
    }
  }, []);

  // Qidirish kerakmi — qoidalar `planAutoSearch` da. "Kutish" bo'lsa bitta taymer qolgan vaqtga qo'yiladi va qayta tekshiriladi.
  const evaluate = useCallback(() => {
    timerRef.current = null;
    const flags = flagsRef.current;
    if (flags.suspended) return;
    const plan = planAutoSearch({
      name: nameRef.current,
      hasImage: flags.hasImage,
      nameEdited: flags.nameEdited,
      now: Date.now(),
      lastEditAt: lastEditAtRef.current,
      shownKey: shownKeyRef.current,
      dismissedKey: dismissedKeyRef.current,
      searchedKeys: searchedKeysRef.current,
      newQueriesDone: newQueriesRef.current,
      blocked: blockedRef.current,
    });
    if (plan.action === 'wait') {
      timerRef.current = window.setTimeout(evaluate, plan.ms);
    } else if (plan.action === 'search') {
      void run(plan.query, plan.key, plan.isNew);
    } else if (plan.reason !== 'already_shown' && plan.reason !== 'dismissed') {
      // Nom o'zgardi yoki rasm tanlandi: eski nomning takliflari ko'rinib turmasin
      reset();
    }
  }, [run, reset]);

  // Nom o'zgargan payt eslab qolinadi
  useEffect(() => {
    lastEditAtRef.current = Date.now();
  }, [name]);

  useEffect(() => {
    if (timerRef.current === null) evaluate();
    // Rasm tanlandi/olib tashlandi yoki qo'lda panel ochildi/yopildi: qayta tekshirish
  }, [name, hasImage, nameEdited, suspended, evaluate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
  }, []);

  /** Egasi takliflarni yopdi: shu nom uchun qaytib chiqmaydi, boshqa nom yozsa yana chiqadi. */
  const dismiss = useCallback(() => {
    dismissedKeyRef.current = shownKeyRef.current ?? searchKey(nameRef.current);
    reset();
  }, [reset]);

  /**
   * Tanlangan rasmni serverga yuklatadi (10-12 soniya ketishi mumkin). Boshqa rasmlar bloklanmaydi: oxirgi bosilgani yutadi.
   * Muvaffaqiyatda tanlov qaytadi, xatoda null (yumshoq xabar ko'rsatiladi).
   */
  const pick = useCallback(async (result: ImageSearchResult): Promise<ImageChoice | null> => {
    pickSeqRef.current += 1;
    const seq = pickSeqRef.current;
    setPickFailed(false);
    setPicking((prev) => (prev.includes(result.id) ? prev : [...prev, result.id]));
    try {
      const response = await pickImage(result);
      if (!mountedRef.current || seq !== pickSeqRef.current) return null;
      return choiceFromPick(response, result, restoUz.bulkImport.images);
    } catch {
      if (mountedRef.current && seq === pickSeqRef.current) setPickFailed(true);
      return null;
    } finally {
      if (mountedRef.current) setPicking((prev) => prev.filter((id) => id !== result.id));
    }
  }, []);

  return {
    phase: view.phase,
    results: view.results,
    query: view.query,
    picking,
    pickFailed,
    dismiss,
    pick,
  };
}
