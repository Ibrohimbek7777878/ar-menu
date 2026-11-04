import React, { useMemo, useState } from 'react';
import { Button, Card, Skeleton, t, useToast } from '@admins/shared';
import { Clock, Plus, Video } from 'lucide-react';
import { createTour } from './api';
import { EditTourModal } from './EditTourModal';
import { ShootingGuide } from './ShootingGuide';
import { failureText } from './labels';
import { hintStyle, innerCardStyle, pageStyle, pageTitleStyle, rowStyle, tapButton } from './styles';
import { formatDuration } from './time';
import type { Tour } from './types';
import { Notice, StatusBadge } from './ui';
import { useTableData, useTours } from './useTours';
import { readFailure } from '../Bookings/errors';

interface Props {
  onOpen: (id: number) => void;
}

/** Sayrlar ro'yxati: kartochkalar, "Yangi sayr" va (bo'sh bo'lsa) suratga olish yo'riqnomasi. */
export const ToursHome: React.FC<Props> = ({ onOpen }) => {
  const { showToast } = useToast();
  const { tours, loading, failure, reload } = useTours();
  const tableData = useTableData();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const hallName = useMemo(() => new Map(tableData.halls.map((hall) => [hall.id, hall.name])), [tableData.halls]);

  const create = async (title: string, hallId: number | null) => {
    setBusy(true);
    setCreateError('');
    try {
      const tour = await createTour({ title, hall_id: hallId });
      setCreating(false);
      onOpen(tour.id);
    } catch (err: unknown) {
      const message = failureText(readFailure(err), t("Sayr yaratib bo'lmadi. Qayta urinib ko'ring."));
      setCreateError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const empty = tours !== null && tours.length === 0;

  return (
    <div style={pageStyle} aria-busy={loading || undefined}>
      <header style={{ ...rowStyle, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={pageTitleStyle}>{t('Sayr')}</h1>
          <p style={{ ...hintStyle, margin: 0, fontSize: 14 }}>{t("Zalingizni videoga oling: mehmonlar videoni oldinga-orqaga yurib ko'radi va stol ustidagi belgidan bron qiladi.")}</p>
        </div>
        {!empty && (
          <Button style={tapButton} onClick={() => { setCreateError(''); setCreating(true); }} icon={<Plus size={18} aria-hidden="true" />}>
            {t('Yangi sayr')}
          </Button>
        )}
      </header>

      {loading && tours === null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          <Skeleton height="200px" borderRadius="var(--radius-lg)" />
          <Skeleton height="200px" borderRadius="var(--radius-lg)" />
        </div>
      )}

      {failure && tours === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <Notice tone="error">{failureText(failure, t("Sayrlar ro'yxatini yuklab bo'lmadi."))}</Notice>
          <Button variant="secondary" style={tapButton} onClick={() => void reload()}>
            {t('Qayta urinish')}
          </Button>
        </div>
      )}

      {empty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ShootingGuide />
          <div>
            <Button size="lg" style={{ ...tapButton, width: '100%', maxWidth: 420 }} onClick={() => { setCreateError(''); setCreating(true); }} icon={<Video size={20} aria-hidden="true" />}>
              {t('Video yuklash')}
            </Button>
            <p style={hintStyle}>{t('Avval sayrga nom berasiz, keyin videoni yuklaysiz.')}</p>
          </div>
        </div>
      )}

      {tours !== null && tours.length > 0 && (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {tours.map((tour) => (
              <li key={tour.id}>
                <TourCard tour={tour} hall={tour.hall_id !== null ? (hallName.get(tour.hall_id) ?? '') : ''} onOpen={() => onOpen(tour.id)} />
              </li>
            ))}
          </ul>
          <details style={{ ...innerCardStyle, marginTop: 20 }}>
            <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--text-main)' }}>{t('Qanday suratga olinadi?')}</summary>
            <div style={{ marginTop: 10 }}>
              <ShootingGuide />
            </div>
          </details>
        </>
      )}

      {creating && (
        <EditTourModal
          open
          mode="create"
          initialTitle=""
          initialHallId={null}
          halls={tableData.halls}
          busy={busy}
          error={createError}
          onClose={() => setCreating(false)}
          onSubmit={(title, hallId) => void create(title, hallId)}
        />
      )}
    </div>
  );
};

const TourCard: React.FC<{ tour: Tour; hall: string; onOpen: () => void }> = ({ tour, hall, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
  >
    <Card hoverable style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        {tour.variants.poster ? (
          <img src={tour.variants.poster} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Video size={36} aria-hidden="true" />
        )}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{tour.title}</div>
        <div style={rowStyle}>
          <StatusBadge status={tour.status} serverLabel={tour.status_label} />
          {tour.duration_s > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
              <Clock size={14} aria-hidden="true" />
              {formatDuration(tour.duration_s)}
            </span>
          )}
        </div>
        {(hall || tour.status === 'ready' || tour.status === 'published') && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {[hall, tour.status === 'ready' || tour.status === 'published' ? t('Nuqtalar: {a} · Belgilar: {b}', { a: tour.stops.length, b: tour.hotspots.length }) : ''].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </Card>
  </button>
);
