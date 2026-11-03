import React from 'react';
import { restoUz } from '../../i18n/uz';
import {
  filledLanguages,
  TRANSLATION_DESCRIPTION_MAX,
  TRANSLATION_NAME_MAX,
  TranslationField,
  TranslationValues,
} from './translations';

interface TranslationFieldsProps {
  values: TranslationValues;
  onChange: (field: TranslationField, value: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-main)',
  fontSize: '14px',
  outline: 'none',
};

/**
 * "Tarjimalar" bo'limi: Русский va English uchun nom + tavsif.
 * Sukut bo'yicha YIG'ILGAN (<details>): asosiy maydonlar ko'payib ketmasin, tarjima ixtiyoriy.
 * Bo'sh qoldirilsa mehmonga o'zbekcha nom/tavsif ko'rinadi.
 */
export const TranslationFields: React.FC<TranslationFieldsProps> = ({ values, onChange }) => {
  const t = restoUz.menuPage;
  const filled = filledLanguages(values).map((lang) => (lang === 'ru' ? t.languageRu : t.languageEn));

  const languages: Array<{
    code: 'ru' | 'en';
    title: string;
    name: TranslationField;
    description: TranslationField;
    namePlaceholder: string;
    descriptionPlaceholder: string;
  }> = [
    {
      code: 'ru',
      title: t.languageRu,
      name: 'name_ru',
      description: 'description_ru',
      namePlaceholder: t.nameRuPlaceholder,
      descriptionPlaceholder: t.descriptionRuPlaceholder,
    },
    {
      code: 'en',
      title: t.languageEn,
      name: 'name_en',
      description: 'description_en',
      namePlaceholder: t.nameEnPlaceholder,
      descriptionPlaceholder: t.descriptionEnPlaceholder,
    },
  ];

  return (
    <details
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          padding: '10px 12px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-main)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px 10px',
        }}
      >
        <span>{t.translationsSummary}</span>
        {filled.length > 0 && (
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-emerald)' }}>
            {t.translationsFilled}: {filled.join(', ')}
          </span>
        )}
      </summary>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 12px 14px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)' }}>
          <strong style={{ color: 'var(--text-muted)' }}>{t.translationsTitle}.</strong> {t.translationsHint}
        </p>

        {languages.map((lang) => (
          <fieldset
            key={lang.code}
            style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <legend style={{ padding: 0, marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              {lang.title}
            </legend>
            <div>
              <label htmlFor={`dish-${lang.name}`} style={labelStyle}>
                {t.nameLabel}
              </label>
              <input
                id={`dish-${lang.name}`}
                type="text"
                lang={lang.code}
                maxLength={TRANSLATION_NAME_MAX}
                placeholder={lang.namePlaceholder}
                value={values[lang.name]}
                onChange={(e) => onChange(lang.name, e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor={`dish-${lang.description}`} style={labelStyle}>
                {t.descriptionLabel}
              </label>
              <textarea
                id={`dish-${lang.description}`}
                rows={2}
                lang={lang.code}
                maxLength={TRANSLATION_DESCRIPTION_MAX}
                placeholder={lang.descriptionPlaceholder}
                value={values[lang.description]}
                onChange={(e) => onChange(lang.description, e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </fieldset>
        ))}
      </div>
    </details>
  );
};

export default TranslationFields;
