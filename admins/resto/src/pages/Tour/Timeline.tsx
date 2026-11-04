import React, { useMemo, useRef } from 'react';
import { t } from '@admins/shared';
import { layoutRows } from './ranges';
import { tableColor } from './styles';
import { formatTime, pointerToTime, timeToRatio } from './time';
import type { DraftHotspot, DraftStop } from './types';

interface Props {
  duration: number;
  time: number;
  onSeek: (seconds: number) => void;
  stops: DraftStop[];
  hotspots: DraftHotspot[];
  selectedHotspotKey: string | null;
  /** AI takliflari (qabul qilinmagan): punktir belgilar */
  suggestedTimes: number[];
}

const STOP_LANE = 16;
const ROW = 8;
const TRACK_AREA = 34;
const MAX_ROWS = 5;

const percent = (ratio: number): string => `${(ratio * 100).toFixed(3)}%`;

/**
 * Vaqt chizig'i: bosish/sudrash bilan sakraydi (slayder). Ustida: nuqtalar (rombchalar), belgi oraliqlari (rangli chiziqlar,
 * kesishganlari alohida qatorda), AI takliflari (punktir). Strelka/bo'sh joy tugmalarini ota element (muharrir) boshqaradi.
 */
export const Timeline: React.FC<Props> = ({ duration, time, onSeek, stops, hotspots, selectedHotspotKey, suggestedTimes }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const rows = useMemo(() => layoutRows(hotspots, MAX_ROWS), [hotspots]);
  const rowCount = hotspots.length === 0 ? 1 : Math.max(...rows) + 1;
  const rangesHeight = rowCount * ROW + 4;
  const total = STOP_LANE + rangesHeight + TRACK_AREA;
  const ratio = timeToRatio(time, duration);

  const seekFromPointer = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek(pointerToTime(clientX, rect.left, rect.width, duration));
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t('Video vaqti')}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, duration)}
      aria-valuenow={Math.min(Math.max(0, time), Math.max(0, duration))}
      aria-valuetext={`${formatTime(time)} / ${formatTime(duration)}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        seekFromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) seekFromPointer(event.clientX);
      }}
      onPointerUp={(event) => {
        dragging.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Home') {
          event.preventDefault();
          onSeek(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          onSeek(duration);
        }
      }}
      style={{ position: 'relative', height: total, margin: '0 10px', touchAction: 'none', cursor: 'pointer', userSelect: 'none' }}
    >
      {/* Nuqtalar */}
      {stops.map((stop) => (
        <span
          key={stop.key}
          aria-hidden="true"
          title={stop.title}
          style={{
            position: 'absolute',
            left: percent(timeToRatio(stop.t, duration)),
            top: 2,
            width: 10,
            height: 10,
            transform: 'translateX(-50%) rotate(45deg)',
            backgroundColor: 'var(--text-main)',
            borderRadius: 2,
          }}
        />
      ))}
      {suggestedTimes.map((at, index) => (
        <span
          key={`ai-${index}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: percent(timeToRatio(at, duration)),
            top: 1,
            width: 10,
            height: 10,
            transform: 'translateX(-50%) rotate(45deg)',
            border: '1px dashed var(--brand)',
            borderRadius: 2,
          }}
        />
      ))}

      {/* Belgi oraliqlari */}
      {hotspots.map((hotspot, index) => {
        const start = timeToRatio(hotspot.t_start, duration);
        const end = timeToRatio(hotspot.t_end, duration);
        const selected = hotspot.key === selectedHotspotKey;
        return (
          <span
            key={hotspot.key}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: percent(start),
              width: `max(4px, ${percent(Math.max(0, end - start))})`,
              top: STOP_LANE + rows[index] * ROW,
              height: 6,
              borderRadius: 3,
              backgroundColor: tableColor(hotspot.table_id),
              opacity: selected ? 1 : 0.75,
              outline: selected ? '2px solid var(--text-main)' : 'none',
              outlineOffset: 1,
            }}
          />
        );
      })}

      {/* Yo'lak va hozirgi vaqt */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: STOP_LANE + rangesHeight + 14, height: 6, borderRadius: 3, backgroundColor: 'var(--border-strong)' }} aria-hidden="true">
        <div style={{ width: percent(ratio), height: '100%', borderRadius: 3, backgroundColor: 'var(--action)' }} />
      </div>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: percent(ratio),
          top: STOP_LANE + rangesHeight + 7,
          width: 20,
          height: 20,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          backgroundColor: 'var(--action)',
          border: '3px solid var(--bg-surface)',
          boxShadow: 'var(--shadow-md)',
        }}
      />
    </div>
  );
};
