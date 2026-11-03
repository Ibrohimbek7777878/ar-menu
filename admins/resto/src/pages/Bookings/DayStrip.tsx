import React from 'react';
import { t } from '@admins/shared';
import type { DayCell } from './dates';
import { dayMonthLabel, longDateLabel, weekdayFull, weekdayShort } from './labels';
import type { DaySummary } from './reservationsView';

interface Props {
  strip: DayCell[];
  selectedDate: string;
  summary: Map<string, DaySummary>;
  /** Qidiruv ishlayapti: kunlar o'chirilgandek ko'rinadi (ro'yxat barcha kunlar bo'yicha) */
  dimmed: boolean;
  onSelect: (iso: string) => void;
}

const dayButton = (selected: boolean): React.CSSProperties => ({
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  minWidth: 60,
  minHeight: 76,
  padding: '6px 8px',
  borderRadius: 'var(--radius-md)',
  border: `1px solid ${selected ? 'var(--action)' : 'var(--border-strong)'}`,
  backgroundColor: selected ? 'var(--action)' : 'var(--bg-surface)',
  color: selected ? 'var(--text-inverse)' : 'var(--text-main)',
  fontFamily: 'inherit',
  cursor: 'pointer',
  scrollSnapAlign: 'start',
});

/** Kunlar lentasi: bugun va keyingi 14 kun; har kunda bronlar soni, kutayotgani bo'lsa belgi bilan. */
export const DayStrip: React.FC<Props> = ({ strip, selectedDate, summary, dimmed, onSelect }) => {
  const outside = !strip.some((cell) => cell.iso === selectedDate);
  return (
    <div
      role="group"
      aria-label={t('Kunni tanlang')}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '2px 2px 8px 2px',
        scrollSnapType: 'x proximity',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {outside && (
        <button type="button" aria-pressed="true" style={dayButton(true)} onClick={() => onSelect(selectedDate)}>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{t('Tanlangan')}</span>
          <span style={{ fontSize: '14px', fontWeight: 800, textAlign: 'center' }}>{longDateLabel(selectedDate)}</span>
        </button>
      )}
      {strip.map((cell) => {
        const selected = !dimmed && cell.iso === selectedDate;
        const info = summary.get(cell.iso);
        const total = info?.total ?? 0;
        const pending = info?.pending ?? 0;
        const label = [
          `${weekdayFull(cell.weekday)}, ${dayMonthLabel(cell.day, cell.month)}`,
          cell.isToday ? t('Bugun') : '',
          total > 0 ? t('{n} ta bron', { n: total }) : t("Bron yo'q"),
          pending > 0 ? t('{n} ta kutilmoqda', { n: pending }) : '',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <button key={cell.iso} type="button" aria-pressed={selected} aria-label={label} style={dayButton(selected)} onClick={() => onSelect(cell.iso)}>
            <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>{cell.isToday ? t('Bugun') : weekdayShort(cell.weekday)}</span>
            <span style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1, fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums' }}>{cell.day}</span>
            <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: 16, fontSize: '12px', fontWeight: 700 }}>
              {total > 0 ? total : ''}
              {pending > 0 && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: selected ? 'var(--text-inverse)' : 'var(--accent-amber)',
                  }}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
