import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Button, commonUz, t as tx } from '@admins/shared';
import { restoUz } from '../../../i18n/uz';
import { appendImageToken } from '../api';
import type { MenuCategory, MenuProduct } from '../api';
import { ImageSearchPanel } from '../BulkImport/ImageSearchPanel';
import { formatPrice, parsePriceInput } from '../BulkImport/rows';
import { TAP, inputStyle, labelStyle, mutedTextStyle } from '../BulkImport/styles';
import { fill } from '../BulkImport/text';
import type { ParseResponse } from '../BulkImport/types';
import { TranslationFields } from '../TranslationFields';
import {
  appendTranslations,
  TRANSLATION_FIELDS,
  translationsFromProduct,
} from '../translations';
import type { TranslationField, TranslationValues } from '../translations';
import { matchCategory } from './categoryMatch';
import { DishCategoryField } from './DishCategoryField';
import { emptyFields, formReducer, initialFormState, isFormDirty, readBadges } from './formState';
import { hasNewImage, imagePayload } from './imagePayload';
import { DISH_DESCRIPTION_MAX, DISH_NAME_MAX } from './parseResult';
import { PhotoCard } from './PhotoCard';
import { readSaveError } from './saveErrors';
import type { SaveError, SaveField } from './saveErrors';
import { SuggestionStrip } from './SuggestionStrip';
import type { CategorySource, DishFields, DishImage, ParsedDish } from './types';
import { useAutoSearch } from './useAutoSearch';
import { useImageReader } from './useImageReader';

const t = restoUz.dishForm;
const PREP_MAX = 32767;

export interface DishFormProps {
  /** Tahrirlanayotgan taom; null = yangi taom. */
  product: MenuProduct | null;
  categories: MenuCategory[];
  /** Menyuda hozir tanlangan kategoriya lentasi ('' = hammasi). */
  tabCategoryId: string;
  /** Lenta tanlanmagan bo'lsa qo'yiladigan boshlang'ich kategoriya (birinchisi); rasmdan topilgani uni almashtirishi mumkin. */
  fallbackCategoryId: string;
  /** Saqlash (yangi: id=null). Xato bo'lsa tashlaydi; muvaffaqiyatda xabarni (toast) o'zi ko'rsatadi. */
  onSave: (id: number | null, formData: FormData) => Promise<unknown>;
  /** Yangi kategoriya yaratish (menyu ro'yxatiga ham qo'shadi). */
  onAddCategory: (name: string) => Promise<MenuCategory>;
  onCancel: () => void;
  onSaved: () => void;
  /** Rasm aslida ko'p taomli menyu surati ekan: o'qilgan natija bilan "Ommaviy qo'shish"ga o'tish. */
  onOpenBulkImport: (response: ParseResponse) => void;
  /** Kiritilgan narsa bor (oynani yopishdan oldin ogohlantirish uchun). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface Initial {
  fields: DishFields;
  source: CategorySource;
  image: DishImage;
  translations: TranslationValues;
}

function buildInitial(props: Pick<DishFormProps, 'product' | 'tabCategoryId' | 'fallbackCategoryId'>): Initial {
  const { product } = props;
  if (product) {
    return {
      fields: {
        name: product.name,
        price: String(product.price ?? ''),
        prepMinutes: String(product.prep_minutes || ''),
        category: String(product.category_id || ''),
        description: product.description || '',
      },
      source: 'user',
      image: product.image
        ? { kind: 'current', url: product.image, credit: product.image_credit ?? '', sourceUrl: product.image_source_url ?? '' }
        : { kind: 'none' },
      translations: translationsFromProduct(product),
    };
  }
  const fromTab = props.tabCategoryId !== '';
  return {
    fields: { ...emptyFields(), category: fromTab ? props.tabCategoryId : props.fallbackCategoryId },
    source: fromTab ? 'tab' : 'default',
    image: { kind: 'none' },
    translations: translationsFromProduct(null),
  };
}

const errorTextStyle: React.CSSProperties = { ...mutedTextStyle, color: 'var(--accent-rose)' };

const ReadBadge: React.FC = () => (
  <span
    style={{
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--accent-amber-border)',
      backgroundColor: 'var(--accent-amber-bg)',
      color: 'var(--text-main)',
      fontSize: '11px',
      fontWeight: 600,
      lineHeight: 1.4,
    }}
  >
    {t.read.badge}
  </span>
);

interface FieldProps {
  id: string;
  label: string;
  badge?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

/** Yorliq (+ "rasmdan o'qildi" belgisi), maydon, xato va izoh. */
const Field: React.FC<FieldProps> = ({ id, label, badge = false, error, hint, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
      <label htmlFor={id} style={{ ...labelStyle, marginBottom: 0, fontSize: '13px' }}>
        {label}
      </label>
      {badge && <ReadBadge />}
    </div>
    {children}
    {error && (
      <p id={`${id}-error`} role="alert" style={{ ...errorTextStyle, marginTop: 4 }}>
        {error}
      </p>
    )}
    {hint}
  </div>
);

/**
 * Taom qo'shish / tahrirlash formasi (Menyu sahifasidagi oyna ichida).
 *
 * Yangi taom oqimi: "Rasm yuklash" (Kamera / Galereya) -> rasm darrov ko'rinadi -> tizim o'qiydi -> bo'sh maydonlar to'ldiriladi
 * (egasi yozganiga tegilmaydi) -> narx so'raladi. Rasm tanlanmagan bo'lsa va nom yozilgan bo'lsa, internetdan rasm takliflari
 * o'zi chiqadi. Tahrirlashda rasm shunchaki almashadi (AI chaqirilmaydi).
 */
export const DishForm: React.FC<DishFormProps> = (props) => {
  const { product, categories, onSave, onAddCategory, onCancel, onSaved, onOpenBulkImport, onDirtyChange } = props;
  const isEdit = product !== null;

  // Forma har ochilganda yangidan quriladi (oyna yopilganda bu komponent o'chadi), shuning uchun boshlang'ich qiymat bir marta
  const [initial] = useState(() => buildInitial(props));
  const [state, dispatch] = useReducer(formReducer, undefined, () => initialFormState(initial.fields, initial.source));
  const { fields } = state;
  const [translations, setTranslations] = useState<TranslationValues>(initial.translations);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<SaveField, string>>>({});
  const [findOpen, setFindOpen] = useState(false);

  const mountedRef = useRef(true);
  const formRef = useRef<HTMLFormElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- Rasm va uni o'qish ----------

  const handleDish = useCallback(
    (dish: ParsedDish) => dispatch({ type: 'autofill', dish, match: matchCategory(dish.category, categories) }),
    [categories],
  );
  const reader = useImageReader({ readEnabled: !isEdit, initialImage: initial.image, onDish: handleDish });

  const hasImage = reader.image.kind !== 'none';
  const nameEdited = fields.name.trim() !== initial.fields.name.trim();
  const suggest = useAutoSearch({ name: fields.name, hasImage, nameEdited, suspended: findOpen });

  // Tanlangan rasm 10-12 soniyada keladi: shu orada egasi o'z suratini yuklagan bo'lsa, internetdagisi uni bosib ketmasin
  const hasImageRef = useRef(hasImage);
  hasImageRef.current = hasImage;
  const pickSuggestion = async (result: Parameters<typeof suggest.pick>[0]) => {
    const choice = await suggest.pick(result);
    if (choice && mountedRef.current && !hasImageRef.current) reader.setInternetImage(choice);
  };

  // Rasmdan narx topilmasa: narx maydoniga fokus ("Narxini yozing"), lekin egasi boshqa maydonga yozayotgan bo'lsa halaqit bermaydi
  const prevHintRef = useRef(false);
  useEffect(() => {
    if (state.priceHint && !prevHintRef.current) {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLElement &&
        formRef.current?.contains(active) === true &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
      if (!typing) {
        priceRef.current?.focus();
        priceRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }
    }
    prevHintRef.current = state.priceHint;
  }, [state.priceHint]);

  // ---------- Yopishdan oldin ogohlantirish ----------

  const dirty =
    isFormDirty(fields, initial.fields) ||
    hasNewImage(reader.image) ||
    TRANSLATION_FIELDS.some((field) => translations[field] !== initial.translations[field]);
  const dirtyCallbackRef = useRef(onDirtyChange);
  dirtyCallbackRef.current = onDirtyChange;
  useEffect(() => {
    dirtyCallbackRef.current?.(dirty);
  }, [dirty]);
  useEffect(() => () => dirtyCallbackRef.current?.(false), []);

  // ---------- Kategoriya ----------

  const createCategory = async (name: string) => {
    const created = await onAddCategory(name);
    return { id: created.id, name: created.name };
  };

  const selectedCategory = categories.find((c) => String(c.id) === fields.category) ?? null;
  const fallbackOption = isEdit && product.category ? { id: product.category.id, name: product.category.name } : null;
  const categoryName = selectedCategory?.name ?? (fallbackOption && String(fallbackOption.id) === fields.category ? fallbackOption.name : '');

  // ---------- Saqlash ----------

  const buildFormData = (mode: 'token' | 'file'): FormData => {
    const fd = new FormData();
    fd.append('name', fields.name.trim());
    fd.append('price', String(parsePriceInput(fields.price) ?? 0));
    // Bo'sh qiymat ham yuboriladi: tahrirlashda "Kategoriyasiz" tanlansa server kategoriyani olib tashlaydi
    fd.append('category_id', fields.category);
    if (fields.prepMinutes) fd.append('prep_minutes', fields.prepMinutes);
    // Tahrirlashda bo'sh tavsif ham yuboriladi: aks holda egasi tavsifni tozalay olmasdi
    if (isEdit || fields.description) fd.append('description', fields.description);
    appendTranslations(fd, translations);

    const payload = imagePayload(reader.image);
    if (mode === 'token') {
      if (payload.file) fd.append('image', payload.file);
      else appendImageToken(fd, payload.token);
    } else if (payload.fallbackFile) {
      fd.append('image', payload.fallbackFile);
    }
    return fd;
  };

  const attempt = async (mode: 'token' | 'file'): Promise<SaveError | null> => {
    try {
      await onSave(product ? product.id : null, buildFormData(mode));
      return null;
    } catch (error) {
      return readSaveError(error, {
        fallback: restoUz.menuPage.saveFailed,
        network: t.network,
        labels: t.errorLabels,
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const found: Partial<Record<SaveField, string>> = {};
    if (!fields.name.trim()) found.name = t.nameRequired;
    if (parsePriceInput(fields.price) === null) found.price = t.priceRequired;
    if (found.name || found.price) {
      setErrors(found);
      (found.name ? nameRef.current : priceRef.current)?.focus();
      return;
    }

    // Davom etayotgan o'qish bekor qilinadi: rasm saqlanayotganda uning kechikkan natijasi maydonlarni o'zgartirmasin
    reader.cancelReading();
    setErrors({});
    setSubmitting(true);

    let error = await attempt('token');
    // Rasm kodi yaroqsiz bo'lsa (2 soatdan keyin): egasining surati bo'lsa fayl bilan qayta uriniladi
    if (error?.imageToken && imagePayload(reader.image).fallbackFile) error = await attempt('file');

    if (!mountedRef.current) return;
    setSubmitting(false);
    if (!error) {
      onSaved();
      return;
    }
    if (error.field === 'image') {
      reader.reportImageError(error.imageToken ? t.photo.expired : tx(error.message));
      return;
    }
    setErrors({ [error.field]: tx(error.message) });
    if (error.field === 'name') nameRef.current?.focus();
    if (error.field === 'price') priceRef.current?.focus();
  };

  const priceNumber = parsePriceInput(fields.price);
  const badges = readBadges(state);
  const showStrip = !hasImage && !findOpen;

  return (
    <form
      ref={formRef}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      // Telefon ekranidan oshib ketsa, faqat ichki qism aylanadi; Bekor qilish / Saqlash tugmalari doim ko'rinib turadi
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100dvh - 150px)' }}
    >
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '2px' }}>
        <PhotoCard
          isEdit={isEdit}
          image={reader.image}
          pendingPreview={reader.pendingPreview}
          reading={reader.reading}
          notice={reader.notice}
          menuMany={reader.menuMany}
          canKeepHeld={reader.canKeepHeld}
          findOpen={findOpen}
          name={fields.name.trim()}
          priceText={priceNumber !== null ? `${formatPrice(priceNumber)} ${commonUz.currency}` : ''}
          categoryName={categoryName}
          description={fields.description.trim()}
          onFile={(file) => {
            setFindOpen(false);
            void reader.pickFile(file);
          }}
          onStopReading={reader.stopReading}
          onRemove={reader.removeImage}
          onKeepHeld={reader.keepHeldPhoto}
          onFindOnline={() => setFindOpen((open) => !open)}
          onGoBulk={onOpenBulkImport}
        />

        {findOpen && (
          <ImageSearchPanel
            initialQuery={fields.name}
            onPicked={(choice) => {
              reader.setInternetImage(choice);
              setFindOpen(false);
            }}
            onClose={() => setFindOpen(false)}
          />
        )}

        {showStrip && (
          <SuggestionStrip
            phase={suggest.phase}
            results={suggest.results}
            query={suggest.query}
            picking={suggest.picking}
            pickFailed={suggest.pickFailed}
            onPick={(result) => void pickSuggestion(result)}
            onClose={suggest.dismiss}
          />
        )}

        <Field id="dish-name" label={t.fields.name} badge={badges.name} error={errors.name}>
          <input
            ref={nameRef}
            id="dish-name"
            type="text"
            autoComplete="off"
            maxLength={DISH_NAME_MAX}
            placeholder={t.fields.namePlaceholder}
            value={fields.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'dish-name-error' : undefined}
            onChange={(e) => {
              dispatch({ type: 'edit', field: 'name', value: e.target.value });
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <Field
            id="dish-price"
            label={t.fields.price}
            badge={badges.price}
            error={errors.price}
            hint={
              state.priceHint ? (
                <p role="status" style={{ ...mutedTextStyle, color: 'var(--action)', fontWeight: 600, marginTop: 4 }}>
                  {t.read.priceHint}
                </p>
              ) : priceNumber !== null ? (
                <p style={{ ...mutedTextStyle, marginTop: 4 }}>{fill(t.fields.priceShown, { price: formatPrice(priceNumber) })}</p>
              ) : undefined
            }
          >
            <input
              ref={priceRef}
              id="dish-price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder={t.fields.pricePlaceholder}
              value={fields.price}
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={errors.price ? 'dish-price-error' : undefined}
              onChange={(e) => {
                // Faqat raqamlar: bo'shliq va nuqta bilan yozilgan narx ("45 000") ham to'g'ri o'qiladi
                const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                dispatch({ type: 'edit', field: 'price', value: digits });
                if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
              }}
              style={{ ...inputStyle, ...(state.priceHint ? { borderColor: 'var(--action)' } : null) }}
            />
          </Field>

          <Field id="dish-prep" label={t.fields.prep} error={errors.prepMinutes}>
            <input
              id="dish-prep"
              type="number"
              inputMode="numeric"
              min={1}
              max={PREP_MAX}
              placeholder="15"
              value={fields.prepMinutes}
              onChange={(e) => dispatch({ type: 'edit', field: 'prepMinutes', value: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field id="dish-category" label={t.fields.category} badge={badges.category} error={errors.category}>
          <DishCategoryField
            id="dish-category"
            value={fields.category}
            categories={categories}
            fallbackOption={fallbackOption}
            suggestion={state.categorySuggestion}
            onSelect={(id) => dispatch({ type: 'set_category', id })}
            onCreate={createCategory}
            onDismissSuggestion={() => dispatch({ type: 'dismiss_category_suggestion' })}
          />
        </Field>

        <Field id="dish-description" label={t.fields.description} badge={badges.description} error={errors.description}>
          <textarea
            id="dish-description"
            rows={3}
            maxLength={DISH_DESCRIPTION_MAX}
            placeholder={t.fields.descriptionPlaceholder}
            value={fields.description}
            onChange={(e) => dispatch({ type: 'edit', field: 'description', value: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }}
          />
        </Field>

        <TranslationFields
          values={translations}
          onChange={(field: TranslationField, value: string) => setTranslations((prev) => ({ ...prev, [field]: value }))}
        />
        {(errors.translations || errors.general) && (
          <p role="alert" style={errorTextStyle}>
            {errors.translations || errors.general}
          </p>
        )}
      </div>

      {/* Doim ko'rinib turadigan pastki panel */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <Button type="button" variant="secondary" onClick={onCancel} style={{ flex: '1 1 130px', maxWidth: 220, minHeight: 48, fontSize: '16px' }}>
          {commonUz.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={submitting} style={{ flex: '1 1 130px', maxWidth: 220, minHeight: Math.max(TAP, 48), fontSize: '16px' }}>
          {commonUz.save}
        </Button>
      </div>
    </form>
  );
};

export default DishForm;
