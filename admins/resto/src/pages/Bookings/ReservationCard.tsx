import React from 'react';
import { Button, Card, t, tr } from '@admins/shared';
import { Armchair, MessageSquare, Pencil, Phone, Users } from 'lucide-react';
import { actionLabel, eventText, statusLabel } from './labels';
import { phoneHref } from './reservationsView';
import { actionsFor, isEditable, sourceKind, toneOf } from './status';
import type { StatusAction } from './status';
import { badgeStyle, tapButton } from './styles';
import { timeRangeLabel } from './time';
import type { BookingConfig, Reservation } from './types';

interface Props {
  row: Reservation;
  config: BookingConfig | null;
  /** Shu bron ustida amal bajarilmoqda (tugmalar o'chadi) */
  busy: boolean;
  onAction: (row: Reservation, action: StatusAction) => void;
  onEdit: (row: Reservation) => void;
}

const SOURCE_LABEL = { site: tr('Sayt orqali'), manual: tr("Qo'lda qo'shilgan"), telegram: tr('Telegram orqali') } as const;

const metaItem: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '14px' };

const ReservationCardBase: React.FC<Props> = ({ row, config, busy, onAction, onEdit }) => {
  const actions = actionsFor(row.status);
  const tone = toneOf(row.status);
  const event = eventText(row, config);
  const href = phoneHref(row.customer_phone);
  const source = sourceKind(row.source);
  const tableText = row.table
    ? row.table.hall
      ? `${t('Stol #{number}', { number: row.table.number })} · ${t(row.table.hall)}`
      : t('Stol #{number}', { number: row.table.number })
    : t('Stol biriktirilmagan');

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums', letterSpacing: '-0.01em' }}>
          {timeRangeLabel(row.reservation_time, row.duration_minutes)}
        </div>
        <span style={badgeStyle(tone)}>{statusLabel(row)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{row.customer_name || t('Ismsiz mehmon')}</div>
        {href && (
          <a href={href} style={{ ...metaItem, minHeight: 44, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
            <Phone size={16} aria-hidden="true" />
            {row.customer_phone}
          </a>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        <span style={metaItem}>
          <Armchair size={16} aria-hidden="true" />
          {tableText}
        </span>
        <span style={metaItem}>
          <Users size={16} aria-hidden="true" />
          {t('{n} kishi', { n: row.guests_count })}
        </span>
        {event && <span style={{ ...badgeStyle('brand'), alignSelf: 'center' }}>{event}</span>}
      </div>

      {row.notes.trim() && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: '14px', color: 'var(--text-main)' }}>
          <MessageSquare size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-dim)' }} />
          <span style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{row.notes.trim()}</span>
        </div>
      )}

      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
        {row.public_code && <span>{t('Kod: {code}', { code: row.public_code })}</span>}
        {row.public_code && source && ' · '}
        {source && <span>{t(SOURCE_LABEL[source])}</span>}
      </div>

      {(actions.length > 0 || isEditable(row.status)) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          {actions.map((action, index) => (
            <Button
              key={action.kind}
              variant={index === 0 && !action.danger ? 'primary' : 'secondary'}
              onClick={() => onAction(row, action)}
              disabled={busy}
              style={{ ...tapButton, ...(action.danger ? { color: 'var(--accent-rose)' } : null) }}
            >
              {actionLabel(action.kind)}
            </Button>
          ))}
          {isEditable(row.status) && (
            <Button variant="ghost" onClick={() => onEdit(row)} disabled={busy} style={{ ...tapButton, marginLeft: 'auto' }}>
              <Pencil size={16} aria-hidden="true" />
              {t('Tahrirlash')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export const ReservationCard = React.memo(ReservationCardBase);
