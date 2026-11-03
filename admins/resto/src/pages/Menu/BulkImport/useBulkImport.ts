import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invalidateCache } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { fetchMenuCategories } from '../api';
import { commitImport, parseImport, undoImport } from './api';
import { extractFailure, failureKind, failureMessage, hasRowErrors } from './errors';
import { MAX_FILES, MAX_TEXT_CHARS, classifyFile } from './files';
import type { FileVerdict } from './files';
import { downscaleImage } from './imageResize';
import { makeUuid } from './ids';
import {
  analyzeRows,
  applyCategoryToIncluded,
  buildCommitRequest,
  collectNewCategoryNames,
  describeRowError,
  findBlockers,
  firstErrorRowId,
  groupRowErrors,
  hasBlockers,
  MAX_ROWS,
  multiplyRowPrice,
  multiplySmallPrices,
  patchRow,
  rowsFromParse,
  setAllIncluded,
  summarizePlan,
} from './rows';
import type { ReviewRowPatch } from './rows';
import { fill } from './text';
import type {
  CategoryOption,
  CommitResponse,
  ParseResponse,
  ReviewRow,
  RowError,
  WarningCode,
} from './types';

const t = restoUz.bulkImport;

export type Step = 'input' | 'review' | 'done';

export interface Problem {
  name: string;
  message: string;
}

export interface Progress {
  current: number;
  total: number;
  name: string;
}

interface ParseSourceItem {
  name: string;
  /** Yuboriladigan narsani tayyorlaydi; rasm bo'lsa kichraytirilgan fayl `image` da (taom surati ko'rinishi uchun). */
  prepare: () => Promise<{ input: { file: File } | { text: string }; image: File | null }>;
}

/** Yuborishdan oldin fayl tayyorlanmadi (masalan, rasm ochilmadi): serverga borilmaydi. */
class PrepareError extends Error {}

/** done: yozildi; rows: server qator-xatolarini qaytardi (hech narsa yozilmagan); failed: boshqa xato; blocked/busy: yuborilmadi. */
export type CommitOutcome = 'done' | 'rows' | 'failed' | 'blocked' | 'busy';

export type UndoState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; archived: number }
  | { status: 'error'; message: string };

function fileProblemMessage(verdict: Exclude<FileVerdict, { ok: true }>, isImage: boolean): string {
  switch (verdict.reason) {
    case 'empty':
      return t.fileProblems.empty;
    case 'too_large':
      return isImage ? t.fileProblems.tooLargeImage : t.fileProblems.tooLargeDocument;
    case 'legacy':
      return t.fileProblems.legacy[verdict.legacy];
    default:
      return t.fileProblems.unsupported;
  }
}

/** Nomlar ro'yxatiga yangilarini qo'shadi (harf registriga qaramay takrorsiz). */
function mergeNames(current: string[], extra: string[]): string[] {
  const result = [...current];
  for (const name of extra) {
    if (!result.some((x) => x.toLowerCase() === name.toLowerCase())) result.push(name);
  }
  return result;
}

/** Ommaviy qo'shish ekranining butun holati: o'qish navbati, qatorlar, tasdiqlash va qaytarish. */
export function useBulkImport() {
  const [step, setStep] = useState<Step>('input');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [existingCategories, setExistingCategories] = useState<CategoryOption[]>([]);
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, RowError[]>>({});
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [undo, setUndo] = useState<UndoState>({ status: 'idle' });

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const parsingRef = useRef(false);
  const committingRef = useRef(false);
  const nextNumberRef = useRef(1);
  const submissionIdRef = useRef<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const existingRef = useRef<CategoryOption[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current = [];
    };
  }, []);

  // Menyudagi bo'limlar (qatorga "mavjud bo'lim" tanlash va yangisini aniqlash uchun)
  useEffect(() => {
    let cancelled = false;
    fetchMenuCategories()
      .then((list) => {
        if (cancelled) return;
        const options = list.map((c) => ({ id: c.id, name: c.name }));
        existingRef.current = options;
        setExistingCategories(options);
      })
      .catch(() => {
        if (!cancelled) setCategoriesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tasdiqlanmagan qatorlar bor paytda sahifani yangilash/yopishdan oldin ogohlantirish
  const dirty = step === 'review' && rows.length > 0;
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ---------- Hisoblangan qiymatlar ----------

  const warnings = useMemo<Map<string, WarningCode[]>>(
    () => analyzeRows(rows, existingCategories),
    [rows, existingCategories],
  );
  const plan = useMemo(() => summarizePlan(rows, existingCategories), [rows, existingCategories]);
  const blockers = useMemo(() => findBlockers(rows), [rows]);

  // ---------- Qatorlarni tahrirlash ----------

  /** Qator o'zgarganda tasdiqlash kaliti va shu qatorning xatosi yangilanadi (yuk o'zgardi). */
  const touch = useCallback((rowId?: string) => {
    submissionIdRef.current = null;
    if (rowId) {
      setRowErrors((prev) => {
        if (!prev[rowId]) return prev;
        const { [rowId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const changeRow = useCallback(
    (id: string, patch: ReviewRowPatch) => {
      touch(id);
      setRows((prev) => patchRow(prev, id, patch));
    },
    [touch],
  );

  const fixRowPrice = useCallback(
    (id: string) => {
      touch(id);
      setRows((prev) => prev.map((row) => (row.id === id ? multiplyRowPrice(row) : row)));
    },
    [touch],
  );

  const includeAll = useCallback(
    (include: boolean) => {
      touch();
      setRows((prev) => setAllIncluded(prev, include));
    },
    [touch],
  );

  const giveCategory = useCallback(
    (category: { name: string; id: number | null }) => {
      touch();
      setRows((prev) => applyCategoryToIncluded(prev, category));
      if (category.id === null && category.name.trim()) {
        setNewCategoryNames((prev) => mergeNames(prev, [category.name.trim()]));
      }
    },
    [touch],
  );

  const fixAllSmallPrices = useCallback(() => {
    touch();
    setRows((prev) => multiplySmallPrices(prev));
  }, [touch]);

  // ---------- O'qish ----------

  const rememberPreview = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    previewUrlsRef.current.push(url);
    return url;
  };

  /** Bir nechta manbani ketma-ket o'qiydi; natijalar bitta ro'yxatga qo'shiladi. */
  const runParse = useCallback(
    async (sources: ParseSourceItem[], initialProblems: Problem[]) => {
      if (parsingRef.current) return;
      parsingRef.current = true;
      setParsing(true);
      setProblems([]);
      const controller = new AbortController();
      abortRef.current = controller;

      const found: ReviewRow[] = [];
      const newProblems: Problem[] = [...initialProblems];
      const newNotes: string[] = [];
      let number = nextNumberRef.current;
      let stopped = false;

      for (let index = 0; index < sources.length; index += 1) {
        if (controller.signal.aborted) {
          stopped = true;
          break;
        }
        const source = sources[index];
        setProgress({ current: index + 1, total: sources.length, name: source.name });
        try {
          const prepared = await source.prepare();
          const response: ParseResponse = await parseImport(prepared.input, controller.signal);
          const preview =
            response.kind === 'dish_photo' && prepared.image ? rememberPreview(prepared.image) : undefined;
          const mapped = rowsFromParse(response, { startNumber: number, localPreviewUrl: preview });
          number += mapped.length;
          found.push(...mapped);

          for (const note of response.notes ?? []) if (note && !newNotes.includes(note)) newNotes.push(note);
          if (response.engine === 'ai' && !newNotes.includes(t.review.engineAi)) newNotes.push(t.review.engineAi);
          if (response.engine === 'ocr' && !newNotes.includes(t.review.engineOcr)) newNotes.push(t.review.engineOcr);
          if (response.truncated) newNotes.push(fill(t.review.truncated, { n: MAX_ROWS }));
          if (sources.length > 1) newNotes.push(fill(t.review.fileCount, { name: source.name, n: mapped.length }));
        } catch (error) {
          if (error instanceof PrepareError) {
            newProblems.push({ name: source.name, message: error.message });
            continue;
          }
          const failure = extractFailure(error);
          if (failure.aborted && controller.signal.aborted) {
            stopped = true;
            break;
          }
          newProblems.push({
            name: source.name,
            message: failureMessage(failure, t.failures),
          });
          // Urinishlar chegarasiga yetildi: qolganlarini ham urib ko'rishdan foyda yo'q
          if (failureKind(failure) === 'rate_limited') {
            if (index < sources.length - 1) newProblems.push({ name: '', message: t.fileProblems.skippedAfterLimit });
            break;
          }
        }
      }

      parsingRef.current = false;
      abortRef.current = null;
      if (!mountedRef.current) return;

      nextNumberRef.current = number;
      setParsing(false);
      setProgress(null);
      setProblems(newProblems);
      if (found.length > 0) {
        touch();
        setRows((prev) => [...prev, ...found]);
        setNotes((prev) => [...prev, ...newNotes.filter((note) => !prev.includes(note))]);
        setNewCategoryNames((prev) => mergeNames(prev, collectNewCategoryNames(found, existingRef.current)));
        setStep('review');
      } else if (stopped) {
        setProblems([]);
      }
    },
    [touch],
  );

  const addFiles = useCallback(
    (picked: File[]) => {
      if (parsingRef.current) return;
      const initialProblems: Problem[] = [];
      let list = picked;
      if (list.length > MAX_FILES) {
        initialProblems.push({ name: '', message: fill(t.fileProblems.tooManyFiles, { n: MAX_FILES }) });
        list = list.slice(0, MAX_FILES);
      }
      const sources: ParseSourceItem[] = [];
      for (const file of list) {
        const verdict = classifyFile(file);
        if (!verdict.ok) {
          const isImage = file.type.startsWith('image/');
          initialProblems.push({ name: file.name, message: fileProblemMessage(verdict, isImage) });
          continue;
        }
        const isImage = verdict.kind === 'image';
        sources.push({
          name: file.name,
          prepare: async () => {
            if (!isImage) return { input: { file }, image: null };
            try {
              const small = await downscaleImage(file);
              return { input: { file: small }, image: small };
            } catch {
              throw new PrepareError(t.fileProblems.imagePrepare);
            }
          },
        });
      }
      if (sources.length === 0) {
        setProblems(initialProblems);
        return;
      }
      void runParse(sources, initialProblems);
    },
    [runParse],
  );

  const addText = useCallback(
    (text: string) => {
      if (parsingRef.current) return;
      const clean = text.trim();
      if (!clean) return;
      if (clean.length > MAX_TEXT_CHARS) {
        setProblems([{ name: '', message: t.fileProblems.textTooLong }]);
        return;
      }
      void runParse(
        [{ name: t.input.pasteLabel, prepare: async () => ({ input: { text: clean }, image: null }) }],
        [],
      );
    },
    [runParse],
  );

  const stopParsing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const openInput = useCallback(() => {
    setProblems([]);
    setStep('input');
  }, []);

  const backToReview = useCallback(() => {
    setProblems([]);
    if (rows.length > 0) setStep('review');
  }, [rows.length]);

  // ---------- Tasdiqlash ----------

  const canCommit = rows.length > 0 && !hasBlockers(blockers);

  const commit = useCallback(async (): Promise<CommitOutcome> => {
    if (committingRef.current) return 'busy';
    const currentBlockers = findBlockers(rows);
    if (hasBlockers(currentBlockers)) return 'blocked';

    committingRef.current = true;
    setCommitting(true);
    setCommitMessage(null);
    setOtherErrors([]);
    // Bir xil yukni qayta yuborish takror yaratmasligi uchun kalit yukka bog'liq (o'zgarsa yangilanadi)
    const submissionId = submissionIdRef.current ?? makeUuid();
    submissionIdRef.current = submissionId;
    try {
      const response = await commitImport(buildCommitRequest(rows, existingCategories, submissionId));
      invalidateCache('resto:menu:');
      if (!mountedRef.current) return 'done';
      setResult(response);
      setStep('done');
      setRowErrors({});
      return 'done';
    } catch (error) {
      const failure = extractFailure(error);
      if (!mountedRef.current) return 'failed';
      if (hasRowErrors(failure)) {
        // Hech narsa yozilmagan: qator-qator xato ko'rsatiladi; yuk o'zgaradi, kalit yangilanadi
        submissionIdRef.current = null;
        const grouped = groupRowErrors(failure.rows, rows);
        setRowErrors(grouped.byRow);
        setOtherErrors(grouped.orphans.map((e) => describeRowError(e, t.fieldLabels)));
        setCommitMessage(fill(t.commit.failedRows, { n: Object.keys(grouped.byRow).length + grouped.orphans.length }));
        const firstId = firstErrorRowId(rows, grouped.byRow);
        if (firstId) {
          window.setTimeout(() => {
            document.getElementById(`bulk-row-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }
        return 'rows';
      } else {
        if (failure.status >= 400 && failure.status < 500) submissionIdRef.current = null;
        setCommitMessage(fill(t.commit.failedGeneral, { message: failureMessage(failure, t.failures) }));
      }
      return 'failed';
    } finally {
      committingRef.current = false;
      if (mountedRef.current) setCommitting(false);
    }
  }, [rows, existingCategories]);

  const clearCommitMessage = useCallback(() => {
    setCommitMessage(null);
    setOtherErrors([]);
  }, []);

  // ---------- Qaytarish ----------

  const undoLast = useCallback(async () => {
    if (!result || undo.status === 'working') return;
    setUndo({ status: 'working' });
    try {
      const response = await undoImport(result.batch_id);
      invalidateCache('resto:menu:');
      if (mountedRef.current) setUndo({ status: 'done', archived: response.archived });
    } catch (error) {
      const failure = extractFailure(error);
      const message =
        failureKind(failure) === 'not_found' ? t.done.undoNotFound : failureMessage(failure, t.failures);
      if (mountedRef.current) setUndo({ status: 'error', message });
    }
  }, [result, undo.status]);

  // ---------- Boshidan boshlash ----------

  const reset = useCallback(() => {
    abortRef.current?.abort();
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    previewUrlsRef.current = [];
    submissionIdRef.current = null;
    nextNumberRef.current = 1;
    setRows([]);
    setNotes([]);
    setProblems([]);
    setNewCategoryNames([]);
    setRowErrors({});
    setOtherErrors([]);
    setCommitMessage(null);
    setResult(null);
    setUndo({ status: 'idle' });
    setStep('input');
  }, []);

  return {
    step,
    rows,
    existingCategories,
    categoriesFailed,
    newCategoryNames,
    notes,
    problems,
    parsing,
    progress,
    warnings,
    plan,
    blockers,
    canCommit,
    committing,
    commitMessage,
    rowErrors,
    otherErrors,
    result,
    undo,
    changeRow,
    fixRowPrice,
    includeAll,
    giveCategory,
    fixAllSmallPrices,
    addFiles,
    addText,
    stopParsing,
    openInput,
    backToReview,
    commit,
    clearCommitMessage,
    undoLast,
    reset,
  };
}
