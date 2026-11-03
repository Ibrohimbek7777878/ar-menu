import React, { useState } from 'react';
import { Button, Card, EmptyState, Skeleton, t, useToast } from '@admins/shared';
import { AlertCircle, CalendarDays, Plus, RefreshCw, Search } from 'lucide-react';
import { DayStrip } from './DayStrip';
import { ReservationCard } from './ReservationCard';
import { actionDone, confirmTexts, filterLabel, longDateLabel } from './labels';
import { readFailure } from './errors';
import { groupByDate } from './reservationsView';
import { STATUS_FILTERS } from './status';
import type { StatusAction } from './status';
import { TAP, inputStyle, tapButton, toggleChipStyle } from './styles';
import type { BookingConfig, Reservation } from './types';
import { ConfirmDialog, Notice } from './ui';
import { ReservationFormModal } from './ReservationFormModal';
import { useReservations } from './useReservations';

interface Props {
  /** Saqlangan bron sozlamasi (mehmon ko'radigani); ruxsat yo'q yoki yuklanmagan bo'lsa null */
  config: BookingConfig | null;
  /** Bron sozlamasi o'chirilgan (mehmonlar bron qila olmaydi) */
  bookingDisabled: boolean;
  canOpenSettings: boolean;
  onOpenSettings: () => void;
}

const statTile: React.CSSProperties = { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 };

/** "Bronlar" tabi: bugungi statistika, kunlar lentasi, qidiruv, holat chiplari va bronlar ro'yxati. */
export const ReservationsTab: React.FC<Props> = ({ config, bookingDisabled, canOpenSettings, onOpenSettings }) => {
  const data = useReservations();
  const { showToast } = useToast();
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; row: Reservation | null } | null>(null);
  const onAdd = () => setForm({ mode: 'create', row: null });
  const onEdit = (row: Reservation) => setForm({ mode: 'edit', row });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<{ row: Reservation; action: StatusAction } | null>(null);

  const run = async (row: Reservation, action: StatusAction) => {
    setBusyId(row.id);
    try {
      await data.changeStatus(row, action.to);
      showToast(actionDone(action.kind), 'success');
    } catch (err: unknown) {
      const failure = readFailure(err);
      showToast(failure.message ? t(failure.message) : t("Holatni o'zgartirib bo'lmadi"), 'error');
      data.refresh(); // ro'yxat serverdagi haqiqiy holatga qaytsin
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  };

  const onAction = (row: Reservation, action: StatusAction) => {
    if (action.confirm) setConfirming({ row, action });
    else void run(row, action);
  };

  const confirmText = confirming ? confirmTexts(confirming.action.kind, confirming.row) : null;
  const showDates = data.searching;
  const statValue = (n: number) => (data.statsReady ? String(n) : '–');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {bookingDisabled && (
        <Notice tone="warn">
          <span>{t("Bron o'chirilgan: mehmonlar sayt orqali bron qila olmaydi. Mavjud bronlar shu yerda ko'rinadi.")}</span>
          {canOpenSettings && (
            <>
              {' '}
              <button
                type="button"
                onClick={onOpenSettings}
                style={{ minHeight: TAP, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 700, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t("Bron sozlamalariga o'tish")}
              </button>
            </>
          )}
        </Notice>
      )}

      {/* Bugungi kun statistikasi */}
      <section aria-label={t('Bugungi kun')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
          <Card style={statTile}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Bugun jami')}</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums' }}>{statValue(data.stats.total)}</span>
          </Card>
          <Card style={statTile}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Kutilmoqda')}</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums' }}>{statValue(data.stats.pending)}</span>
          </Card>
          <Card style={statTile}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Tasdiqlangan')}</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'lining-nums' }}>{statValue(data.stats.confirmed)}</span>
          </Card>
        </div>
      </section>

      <DayStrip
        strip={data.strip}
        selectedDate={data.selectedDate}
        summary={data.daySummary}
        dimmed={data.searching}
        onSelect={(iso) => {
          data.setQuery('');
          data.setSelectedDate(iso);
        }}
      />

      {/* Qidiruv, boshqa sana, qo'shish */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="search"
            value={data.query}
            onChange={(e) => data.setQuery(e.target.value)}
            placeholder={t('Ism, telefon yoki bron kodi')}
            aria-label={t('Ism, telefon yoki bron kodi')}
            autoComplete="off"
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
        <div style={{ flex: '0 1 180px' }}>
          <input
            type="date"
            value={data.selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                data.setQuery('');
                data.setSelectedDate(e.target.value);
              }
            }}
            aria-label={t('Boshqa sana')}
            style={inputStyle}
          />
        </div>
        <Button variant="secondary" onClick={data.refresh} aria-label={t('Qayta yuklash')} title={t('Qayta yuklash')} style={tapButton}>
          <RefreshCw size={18} aria-hidden="true" />
        </Button>
        <Button variant="primary" onClick={onAdd} style={tapButton}>
          <Plus size={18} aria-hidden="true" />
          {t("Qo'lda bron qo'shish")}
        </Button>
      </div>
      {data.searching && <p style={{ margin: '-8px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{t("Qidiruv barcha kunlar bo'yicha ishlaydi.")}</p>}

      {/* Holat chiplari */}
      <div role="group" aria-label={t("Holat bo'yicha")} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STATUS_FILTERS.map((filter) => (
          <button key={filter} type="button" aria-pressed={data.statusFilter === filter} onClick={() => data.setStatusFilter(filter)} style={toggleChipStyle(data.statusFilter === filter)}>
            {filterLabel(filter)} ({data.counts[filter]})
          </button>
        ))}
      </div>

      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
        {data.searching ? t('Qidiruv natijalari: {n} ta', { n: data.rows.length }) : longDateLabel(data.selectedDate)}
      </h2>

      {data.error && (
        <Card style={{ borderColor: 'var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-rose)', flexWrap: 'wrap' }}>
            <AlertCircle size={20} aria-hidden="true" />
            <span style={{ flex: '1 1 200px' }}>{t(data.error)}</span>
            <Button variant="secondary" onClick={data.refresh} style={tapButton}>
              {t('Qayta urinish')}
            </Button>
          </div>
        </Card>
      )}

      {data.loading && data.rows.length === 0 && !data.error ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height="150px" borderRadius="var(--radius-lg)" />
          ))}
        </div>
      ) : data.rows.length === 0 && !data.error ? (
        <EmptyState
          icon={<CalendarDays size={40} aria-hidden="true" />}
          title={data.searching ? t('Hech narsa topilmadi') : data.statusFilter !== 'all' ? t("Bu holatdagi bron yo'q") : t("Bu kunga bron yo'q")}
          description={data.searching ? t("Ism, telefon yoki bron kodini tekshirib ko'ring.") : t("Mehmonlar sayt orqali bron qilganda yoki siz qo'lda qo'shganda shu yerda ko'rinadi.")}
          action={
            !data.searching ? (
              <Button variant="primary" onClick={onAdd} style={tapButton}>
                <Plus size={18} aria-hidden="true" />
                {t("Qo'lda bron qo'shish")}
              </Button>
            ) : undefined
          }
        />
      ) : showDates ? (
        groupByDate(data.rows).map((group) => (
          <section key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>{longDateLabel(group.date)}</h3>
            {group.rows.map((row) => (
              <ReservationCard key={row.id} row={row} config={config} busy={busyId === row.id} onAction={onAction} onEdit={onEdit} />
            ))}
          </section>
        ))
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.rows.map((row) => (
            <ReservationCard key={row.id} row={row} config={config} busy={busyId === row.id} onAction={onAction} onEdit={onEdit} />
          ))}
        </div>
      )}

      <ReservationFormModal
        open={form !== null}
        mode={form?.mode ?? 'create'}
        row={form?.row ?? null}
        today={data.today}
        defaultDate={data.selectedDate}
        config={config}
        onClose={() => setForm(null)}
        onCreate={async (payload) => {
          await data.create(payload);
          showToast(t("Bron qo'shildi"), 'success');
        }}
        onEdit={async (row, patch) => {
          await data.edit(row, patch);
          showToast(t('Bron yangilandi'), 'success');
        }}
      />

      <ConfirmDialog
        open={confirming !== null}
        title={confirmText?.title ?? ''}
        message={confirmText?.message ?? ''}
        confirmLabel={confirmText?.button ?? ''}
        danger
        busy={busyId !== null && confirming !== null}
        onConfirm={() => confirming && void run(confirming.row, confirming.action)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};

