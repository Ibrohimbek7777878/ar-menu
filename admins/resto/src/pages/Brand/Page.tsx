import React, { useMemo } from 'react';
import { Button, Skeleton, t, useToast } from '@admins/shared';
import { Save, Undo2 } from 'lucide-react';
import { BasicsCard } from './BasicsCard';
import { BusinessCard } from './BusinessCard';
import { ColorsCard } from './ColorsCard';
import { ContactCard } from './ContactCard';
import { FontCard } from './FontCard';
import { HeroCard } from './HeroCard';
import { ModulesCard } from './ModulesCard';
import { Preview } from './Preview';
import { FIELD_LIMITS, previewColors } from './brandModel';
import { fieldLabel, issueText } from './labels';
import { pageStyle, hintStyle, stickyBarStyle, tapButton } from './styles';
import { Notice } from './ui';
import { clearBrandDraftStash, useBrand } from './useBrand';
import { useContainerWidth } from '../Menu/BulkImport/useContainerWidth';
import { useLeaveGuard } from '../Bookings/useLeaveGuard';

/** Ish maydoni shu kenglikdan oshsa maket o'ngda (yopishib turadi), aks holda tepada */
const WIDE_FROM = 900;
const PREVIEW_WIDTH = 340;

/**
 * Brend bo'limi (`/ra/brand`): nom, logotip, ranglar, shrift, bosh sahifa matnlari, aloqa, bo'limlar va biznes turi.
 * Hammasi tugmalar bilan, kodsiz; o'zgarishlar bitta "Saqlash" panelida saqlanadi. Logotip va shablon alohida so'rov bilan darrov saqlanadi.
 */
export const BrandPage: React.FC = () => {
  const brand = useBrand();
  const { draft, saved, loading, loadFailure, saving, submitted, serverIssue, paths, dirty, issues } = brand;
  const { showToast } = useToast();
  const [containerRef, width] = useContainerWidth<HTMLDivElement>();
  const wide = width >= WIDE_FROM;

  // Saqlanmagan o'zgarish bilan sahifadan chiqib ketishdan oldin tasdiq (yorliq yopish, yangilash, yon menyu)
  useLeaveGuard(dirty, t("Brend sozlamalarida saqlanmagan o'zgarishlar bor. Sahifadan chiqsangiz, ular yo'qoladi. Chiqamizmi?"), clearBrandDraftStash);

  // Yo'l -> xabar. Server xatosi doim ko'rinadi; mijoz tekshiruvi faqat "Saqlash" bosilgandan keyin
  const messages = useMemo(() => {
    const map = new Map<string, string>();
    if (submitted) for (const issue of issues) if (!map.has(issue.path)) map.set(issue.path, issueText(issue));
    if (serverIssue?.path) map.set(serverIssue.path, serverIssue.message ? t(serverIssue.message) : t("Bu maydonda xato bor"));
    return map;
  }, [issues, submitted, serverIssue]);
  const messageFor = (path: string) => messages.get(path);

  const header = (
    <header style={{ marginBottom: '16px' }}>
      <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('Brend')}</h1>
      <p style={{ ...hintStyle, margin: 0, fontSize: '14px' }}>{t("Logotip, ranglar, shrift va matnlar: mehmon saytingiz sizning brendingizda ko'rinadi. Kod yozish shart emas.")}</p>
    </header>
  );

  // Bitta barqaror o'ram (ref shunda): yuklanish -> tayyor o'tishida o'lcham kuzatuvchisi uzilib qolmasin
  const wrap = (children: React.ReactNode, busy = false) => (
    <div ref={containerRef} style={pageStyle} aria-busy={busy || undefined}>
      {header}
      {children}
    </div>
  );

  if (loading && !draft) {
    return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton height="220px" borderRadius="var(--radius-lg)" />
        <Skeleton height="260px" borderRadius="var(--radius-lg)" />
      </div>,
      true,
    );
  }

  if (!draft || !saved) {
    const text = loadFailure?.forbidden
      ? t("Brend sozlamalarini ko'rishga ruxsatingiz yo'q.")
      : loadFailure?.code === 'no_brand'
        ? t("Tizim hali brend sozlamalarini bermadi. Birozdan keyin qayta urinib ko'ring.")
        : loadFailure?.message
          ? t(loadFailure.message)
          : t("Brend sozlamalarini yuklab bo'lmadi.");
    return wrap(
      <Notice tone="error">
        <span>{text}</span>{' '}
        {!loadFailure?.forbidden && (
          <button
            type="button"
            onClick={() => void brand.reload()}
            style={{ minHeight: 44, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('Qayta urinish')}
          </button>
        )}
      </Notice>,
    );
  }

  const notify = (message: string, tone: 'success' | 'error') => showToast(message, tone);

  const save = async () => {
    const result = await brand.save();
    if (result.status === 'saved') {
      showToast(t('Brend saqlandi'), 'success');
      if (result.brand.adjusted && result.brand.palette === 'custom') showToast(t("Rang o'qilishi uchun to'qroq qilindi"), 'info');
    } else if (result.status === 'invalid') {
      showToast(t("Belgilangan maydonlarni tuzating, so'ng saqlang"), 'error');
    } else {
      showToast(result.failure.forbidden ? t("Sozlamalarni o'zgartirishga ruxsatingiz yo'q") : result.failure.message ? t(result.failure.message) : t("Saqlab bo'lmadi. Qayta urinib ko'ring."), 'error');
    }
  };

  const common = { draft, saved, messageFor, edit: brand.edit };
  const form = (
    <fieldset disabled={saving} style={{ margin: 0, padding: 0, border: 'none', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BasicsCard {...common} onUpload={brand.uploadImage} onRemove={brand.removeImage} onNotify={notify} />
      <ColorsCard {...common} />
      <FontCard {...common} />
      <HeroCard {...common} />
      <ContactCard {...common} />
      <ModulesCard {...common} />
      <BusinessCard {...common} onApply={brand.applyPreset} onNotify={notify} dirty={dirty} />
    </fieldset>
  );
  const preview = <Preview brand={draft} colors={previewColors(draft, saved)} />;

  return wrap(
    <>
      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${PREVIEW_WIDTH}px`, gap: '16px', alignItems: 'start' }}>
          {form}
          <div style={{ position: 'sticky', top: '16px' }}>{preview}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {preview}
          {form}
        </div>
      )}

      {/* Saqlash paneli */}
      <div style={{ ...stickyBarStyle, marginTop: '16px' }}>
        <div style={{ flex: '1 1 160px', minWidth: 0, fontSize: '14px', color: dirty ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: dirty ? 700 : 500 }} role="status">
          {dirty ? t("Saqlanmagan o'zgarishlar: {n} ta", { n: paths.length }) : t("O'zgarish yo'q")}
        </div>
        {serverIssue && (
          <div style={{ flexBasis: '100%' }}>
            <Notice tone="error">
              {serverIssue.path in FIELD_LIMITS ? `${fieldLabel(serverIssue.path)}: ` : ''}
              {serverIssue.message ? t(serverIssue.message) : t("Saqlab bo'lmadi")}
            </Notice>
          </div>
        )}
        <Button variant="secondary" onClick={brand.discard} disabled={!dirty || saving} style={tapButton}>
          <Undo2 size={18} aria-hidden="true" />
          {t("O'zgarishlarni bekor qilish")}
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty} loading={saving} style={tapButton}>
          <Save size={18} aria-hidden="true" />
          {t('Saqlash')}
        </Button>
      </div>
    </>,
  );
};

export default BrandPage;
