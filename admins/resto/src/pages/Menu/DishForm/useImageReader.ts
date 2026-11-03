import { useCallback, useEffect, useRef, useState } from 'react';
import { restoUz } from '../../../i18n/uz';
import { parseImport } from '../BulkImport/api';
import { extractFailure, failureKind } from '../BulkImport/errors';
import { downscaleImage } from '../BulkImport/imageResize';
import type { ImageChoice, ParseResponse } from '../BulkImport/types';
import { interpretParse } from './parseResult';
import type { DishImage, ParsedDish } from './types';

const t = restoUz.dishForm;

export interface ReadNotice {
  /** soft — yumshoq izoh (forma ishlashda davom etadi); error — rasmning o'zi bilan muammo. */
  tone: 'soft' | 'error';
  text: string;
}

/** Rasm aslida menyu surati ekan va unda bir nechta taom bor. */
export interface MenuMany {
  count: number;
  response: ParseResponse;
}

/** Menyu surati deb topilgan rasm: egasi xohlasa baribir taom surati qilib qo'yishi mumkin. */
interface HeldPhoto {
  file: File;
  previewUrl: string;
}

interface Options {
  /** Rasmni AI o'qiydimi (faqat yangi taom). Tahrirlashda rasm shunchaki almashadi. */
  readEnabled: boolean;
  initialImage: DishImage;
  /** O'qilgan ma'lumotni forma maydonlariga joylash (bo'sh maydonlarni to'ldirish qoidasi formReducer'da). */
  onDish: (dish: ParsedDish) => void;
}

/**
 * Taom rasmi va uni "o'qish" oqimi:
 *  rasm tanlandi -> brauzerda kichraytiriladi -> darrov ko'rinadi -> server o'qiydi -> maydonlar to'ldiriladi.
 * Forma hech qachon bloklanmaydi: o'qish xato bersa ham rasm taom surati bo'lib qoladi. Yangi rasm tanlansa, saqlash bosilsa
 * yoki forma yopilsa eski so'rov bekor qilinadi va uning kechikkan natijasi e'tiborga olinmaydi.
 */
export function useImageReader({ readEnabled, initialImage, onDish }: Options) {
  const [image, setImage] = useState<DishImage>(initialImage);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<ReadNotice | null>(null);
  const [menuMany, setMenuMany] = useState<MenuMany | null>(null);
  const [held, setHeld] = useState<HeldPhoto | null>(null);
  // Tanlangan rasm kichraytirilguncha asl rasm ko'rinib turadi (kutish bo'sh ekran bo'lib qolmasin)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const imageRef = useRef(image);
  imageRef.current = image;
  const onDishRef = useRef(onDish);
  onDishRef.current = onDish;
  const seqRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);
  const urlsRef = useRef<string[]>([]);

  // Forma yopilganda so'rov to'xtatiladi va vaqtincha manzillar bo'shatiladi
  useEffect(
    () => () => {
      seqRef.current += 1;
      controllerRef.current?.abort();
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current = [];
    },
    [],
  );

  /** Davom etayotgan o'qishni bekor qiladi; uning natijasi endi e'tiborga olinmaydi. */
  const cancelReading = useCallback(() => {
    seqRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPendingPreview(null);
    setReading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setNotice(null);
    setMenuMany(null);
    setHeld(null);
  }, []);

  const pickFile = useCallback(
    async (file: File) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      stoppedByUserRef.current = false;
      const previous = imageRef.current;

      clearMessages();
      // "Rasm o'qilmoqda…" faqat rasm haqiqatan o'qiladigan bo'lsa ko'rsatiladi (tahrirlashda rasm shunchaki almashadi)
      setReading(readEnabled);

      const quickUrl = URL.createObjectURL(file);
      urlsRef.current.push(quickUrl);
      setPendingPreview(quickUrl);

      let small: File;
      try {
        small = await downscaleImage(file);
      } catch {
        if (seq !== seqRef.current) return;
        setPendingPreview(null);
        setReading(false);
        setNotice({ tone: 'error', text: t.photo.prepareFailed });
        return;
      }
      if (seq !== seqRef.current) return;

      const previewUrl = URL.createObjectURL(small);
      urlsRef.current.push(previewUrl);
      const mine: DishImage = { kind: 'file', file: small, previewUrl, token: null };
      setImage(mine);
      setPendingPreview(null);

      if (!readEnabled) {
        setReading(false);
        return;
      }

      try {
        const response = await parseImport({ file: small }, controller.signal);
        if (seq !== seqRef.current) return;
        const outcome = interpretParse(response);
        if (outcome.kind === 'dish') {
          // Rasm serverda saqlangan: saqlashda qayta yuklanmaydi
          setImage({ ...mine, token: outcome.token });
          onDishRef.current(outcome.dish);
        } else if (outcome.kind === 'menu_single') {
          // Menyu surati taom surati bo'lib qolmasin
          setImage(previous);
          setHeld({ file: small, previewUrl });
          onDishRef.current(outcome.dish);
          setNotice({ tone: 'soft', text: t.read.menuSingle });
        } else if (outcome.kind === 'menu_many') {
          setImage(previous);
          setHeld({ file: small, previewUrl });
          setMenuMany({ count: outcome.count, response });
        } else {
          setNotice({ tone: 'soft', text: t.read.failed });
        }
      } catch (error) {
        if (seq !== seqRef.current) return;
        const failure = extractFailure(error);
        if (failure.aborted && controller.signal.aborted) {
          // Egasi o'zi to'xtatdi (boshqa bekor qilishlar yuqoridagi `seq` tekshiruvida jim o'tadi)
          if (stoppedByUserRef.current) setNotice({ tone: 'soft', text: t.read.stopped });
        } else {
          // Rasm baribir taom surati bo'lib qoladi; forma ishlayveradi
          setNotice({ tone: 'soft', text: failureKind(failure) === 'rate_limited' ? t.read.limited : t.read.failed });
        }
      } finally {
        if (seq === seqRef.current) setReading(false);
      }
    },
    [readEnabled, clearMessages],
  );

  const stopReading = useCallback(() => {
    stoppedByUserRef.current = true;
    controllerRef.current?.abort();
  }, []);

  /** Internetdan tanlangan namuna rasm. */
  const setInternetImage = useCallback(
    (choice: ImageChoice) => {
      cancelReading();
      clearMessages();
      setImage({
        kind: 'internet',
        token: choice.token,
        previewUrl: choice.previewUrl,
        credit: choice.credit,
        sourceUrl: choice.sourceUrl,
      });
    },
    [cancelReading, clearMessages],
  );

  /** Yangi tanlangan rasmni bekor qiladi: forma ochilgandagi rasmga (yoki rasmsiz holatga) qaytadi. */
  const removeImage = useCallback(() => {
    cancelReading();
    clearMessages();
    setImage(initialImage);
  }, [cancelReading, clearMessages, initialImage]);

  /** "Baribir shu rasmni qo'yish": menyu surati deb topilgan rasm taom surati bo'ladi (o'qilgan ma'lumot qayta yozilmaydi). */
  const keepHeldPhoto = useCallback(() => {
    if (!held) return;
    setImage({ kind: 'file', file: held.file, previewUrl: held.previewUrl, token: null });
    clearMessages();
  }, [held, clearMessages]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  /** Saqlash payti server rasmni rad etsa (masalan, muddati tugagan): xabar rasm yonida ko'rsatiladi. */
  const reportImageError = useCallback((text: string) => setNotice({ tone: 'error', text }), []);

  return {
    image,
    pendingPreview,
    reading,
    notice,
    menuMany,
    canKeepHeld: held !== null,
    pickFile,
    stopReading,
    cancelReading,
    setInternetImage,
    removeImage,
    keepHeldPhoto,
    dismissNotice,
    reportImageError,
  };
}
