import React from 'react';
import { t } from '@admins/shared';
import { fontStack } from './fonts';
import { MODULE_LABEL } from './labels';
import { MODULE_KEYS } from './types';
import type { PaletteColors } from './brandModel';
import type { Brand } from './types';
import { Section } from './ui';

interface Props {
  brand: Brand;
  colors: PaletteColors;
}

/**
 * Mehmon saytining kichik maketi: tanlangan rang, shrift, logotip, nom va matnlar bilan DARROV o'zgaradi (saqlashdan oldin).
 * Rang va shrift maket ichida CSS o'zgaruvchilari (--pv-*) sifatida beriladi: bular foydalanuvchi tanlagan MA'LUMOT.
 * Sirt va matn ranglari admin tokenlaridan (kun/tun'ga mos); haqiqiy sayt biroz farq qilishi mumkin.
 */
export const Preview: React.FC<Props> = ({ brand, colors }) => {
  const variables = { '--pv-primary': colors.primary, '--pv-accent': colors.accent, '--pv-font': fontStack(brand.font) } as React.CSSProperties;
  const name = brand.name.trim() || t('Restoran nomi');
  const tagline = brand.tagline.trim();
  const title = brand.hero.title.trim() || t('Xush kelibsiz!');
  const subtitle = brand.hero.subtitle.trim() || t("Menyuni ko'ring, stol band qiling va buyurtma bering.");
  const cta = brand.hero.cta_text.trim() || t("Menyuni ko'rish");
  const info = [brand.contact.phone.trim(), brand.contact.address.trim(), brand.contact.hours_text.trim()].filter(Boolean);
  const modules = MODULE_KEYS.filter((key) => brand.modules[key]);

  return (
    <Section title={t("Oldindan ko'rish")} hint={t("Rang, shrift va matnlar saqlashdan oldin ham darrov o'zgaradi. Haqiqiy sayt biroz farq qilishi mumkin.")}>
      <div
        aria-hidden="true"
        style={{
          ...variables,
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto',
          overflow: 'hidden',
          boxSizing: 'border-box',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--text-main)',
        }}
      >
        {/* Tepa: logotip, nom, shior */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <span
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--pv-primary)',
                color: 'var(--text-inverse)',
                fontFamily: 'var(--pv-font)',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              {Array.from(name)[0]?.toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--pv-font)', fontSize: '16px', fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{name}</div>
            {tagline && <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{tagline}</div>}
          </div>
        </div>

        {/* Birinchi ekran */}
        <div style={{ padding: '22px 16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: 'var(--pv-font)', fontSize: '26px', fontWeight: 700, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{title}</div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{subtitle}</div>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '11px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--pv-primary)',
                color: 'var(--text-inverse)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {cta}
            </span>
          </div>
        </div>

        {/* Yoqilgan bo'limlar */}
        {modules.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 16px 14px' }}>
            {modules.map((key) => (
              <span
                key={key}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--pv-primary)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {t(MODULE_LABEL[key])}
              </span>
            ))}
          </div>
        )}

        {/* Namuna taom kartasi */}
        <div style={{ margin: '0 16px 14px', display: 'flex', gap: '10px', padding: '10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--pv-font)', fontSize: '15px', fontWeight: 700 }}>{t('Namuna taom')}</div>
            <div style={{ marginTop: 4, height: 6, width: '70%', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-surface-hover)' }} />
            <div style={{ marginTop: 6, fontSize: '12px', fontWeight: 700, color: 'var(--pv-accent)' }}>{t('Yangi')}</div>
          </div>
        </div>

        {/* Aloqa */}
        {info.length > 0 && (
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
            {info.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
};
