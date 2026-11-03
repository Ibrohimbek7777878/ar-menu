/**
 * Ruxsatlar bo'limining qismlari: bitta ruxsat qatori (nom, tushuntirish, holat chip'i, almashtirgich) va
 * "Bu xodim nimani ko'radi" xulosasi.
 */
import React from 'react';
import { t } from '@admins/shared';
import { Lock, TriangleAlert } from 'lucide-react';
import type { AccessSummary, CatalogItem, LockReason, PermState } from './permissions';
import { cardStyle, cardTitleStyle, hintStyle } from './profileStyles';
import type { ChipTone } from './profileStyles';
import { Chip, Switch } from './profileUi';
import { restoUz } from '../../i18n/uz';

/** Guruh nomi: serverdan keladi (o'zbekcha); guruhsiz ruxsatlar "Boshqa". Tarjima lug'atida bo'lsa tarjima qilinadi. */
export function groupTitle(group: string): string {
  return group ? t(group) : t('Boshqa');
}

const STATE_TONE: Record<PermState, ChipTone> = {
  role: 'brand',
  extra: 'success',
  revoked: 'danger',
  none: 'neutral',
};

function stateText(state: PermState): string {
  switch (state) {
    case 'role':
      return t("Rol bo'yicha bor");
    case 'extra':
      return t("Qo'shimcha berilgan");
    case 'revoked':
      return t('Olib tashlangan');
    default:
      return t("Yo'q");
  }
}

function lockText(reason: LockReason): string {
  return reason === 'sensitive'
    ? t("Faqat restoran egasi o'zgartira oladi")
    : t("Sizda bu ruxsat yo'q, shuning uchun uni boshqaga bera olmaysiz");
}

interface RowProps {
  item: CatalogItem;
  state: PermState;
  on: boolean;
  lock: LockReason | null;
  /** Ro'yxat faqat o'qish uchun: almashtirgich ko'rsatilmaydi, holat chip'i yetarli. */
  readOnly: boolean;
  onToggle: (key: string, next: boolean) => void;
}

export const PermissionRow: React.FC<RowProps> = ({ item, state, on, lock, readOnly, onToggle }) => {
  const base = `perm-${item.key}`;
  const descriptionId = item.description ? `${base}-desc` : undefined;
  const lockId = lock ? `${base}-lock` : undefined;
  const describedBy = [descriptionId, lockId].filter(Boolean).join(' ') || undefined;
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '10px 0',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{t(item.label)}</span>
          <Chip tone={STATE_TONE[state]}>{stateText(state)}</Chip>
        </div>
        {item.description && (
          <p id={descriptionId} style={hintStyle}>
            {t(item.description)}
          </p>
        )}
        {item.sensitive && (
          <p style={{ ...hintStyle, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-amber)', fontWeight: 600 }}>
            <TriangleAlert size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            {t("Pul/xodim ma'lumotiga ruxsat")}
          </p>
        )}
        {lock && (
          <p id={lockId} style={{ ...hintStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            {lockText(lock)}
          </p>
        )}
      </div>
      {!readOnly && (
        <Switch checked={on} onChange={(next) => onToggle(item.key, next)} disabled={lock !== null} label={t(item.label)} describedBy={describedBy} />
      )}
    </li>
  );
};

interface SummaryProps {
  summary: AccessSummary;
  /** Egasi: hamma bo'lim ochiq (ro'yxat kerak emas). */
  everything: boolean;
  panelLabel: string | null | undefined;
  /** Rol o'zgartirilgan, lekin hali saqlanmagan: kirgach ochiladigan sahifa hozircha eski. */
  panelStale: boolean;
}

export const AccessSummaryCard: React.FC<SummaryProps> = ({ summary, everything, panelLabel, panelStale }) => (
  <section style={cardStyle} aria-label={t("Bu xodim nimani ko'radi")}>
    <h4 style={cardTitleStyle}>{t("Bu xodim nimani ko'radi")}</h4>
    {everything ? (
      <p style={{ ...hintStyle, margin: 0 }}>{t("Hamma bo'limlar ochiq.")}</p>
    ) : summary.total === 0 ? (
      <p style={{ ...hintStyle, margin: 0 }}>{t("Hech qanday ruxsat yo'q: xodim hech narsani ko'ra olmaydi.")}</p>
    ) : (
      <>
        <p style={{ ...hintStyle, margin: 0 }}>{t('Jami ruxsatlar: {n}', { n: summary.total })}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary.groups.map((g) => (
            <li key={g.group || '_other'} style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>{groupTitle(g.group)}:</strong> {g.labels.map((label) => t(label)).join(', ')}
            </li>
          ))}
        </ul>
      </>
    )}
    {panelLabel && (
      <p style={{ ...hintStyle, margin: 0 }}>
        {restoUz.staffPage.access.panelLabel}: <strong style={{ color: 'var(--text-main)' }}>{panelLabel}</strong>
        {panelStale ? ` (${t('rol saqlangandan keyin yangilanadi')})` : ''}
      </p>
    )}
  </section>
);
