import React, { useEffect, useRef, useState } from 'react';
import { Button, t } from '@admins/shared';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { containRect, dragTo, normalizedToPoint, nudgePoint, pointToNormalized } from './geometry';
import type { Point, Size } from './geometry';
import { suggestedAt, visibleAt } from './ranges';
import { MARKER, TAP, tapButton } from './styles';
import { formatTime } from './time';
import type { DraftHotspot } from './types';
import type { KeyedHotspotSuggestion } from './editModel';
import type { VideoClock } from './useVideoClock';
import { Notice } from './ui';

interface StageProps {
  src: string;
  poster: string;
  clock: VideoClock;
  /** Serverdagi video o'lchami (brauzer metama'lumoti kelguncha) */
  tourSize: Size;
  maxHeight: string;
  hotspots: DraftHotspot[];
  suggestions: KeyedHotspotSuggestion[];
  selectedKey: string | null;
  selectedSuggestionKey: string | null;
  /** Tanlangan belgining yangi joyini kadrdan tanlash rejimi */
  relocating: boolean;
  locked: boolean;
  tableNumberOf: (hotspot: DraftHotspot) => string;
  onPlace: (point: Point) => void;
  onRelocate: (point: Point) => void;
  onSelect: (key: string) => void;
  onMove: (key: string, point: Point) => void;
  onSelectSuggestion: (key: string) => void;
}

const circleBase: React.CSSProperties = {
  width: MARKER,
  height: MARKER,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  color: 'var(--text-inverse)',
  boxSizing: 'border-box',
  lineHeight: 1,
};

const markerButton = (point: Point): React.CSSProperties => ({
  position: 'absolute',
  left: point.x,
  top: point.y,
  width: TAP,
  height: TAP,
  padding: 0,
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'grab',
  touchAction: 'none',
});

/**
 * Video + ustidagi belgilar qatlami. Belgilar koordinatalari kadrning HAQIQIY ko'rinadigan maydoniga nisbatan 0..1
 * (`object-fit: contain` yon/tepa chiziqlari hisobga olinadi): bosish ham, chizish ham shu maydon bo'yicha.
 */
export const VideoStage: React.FC<StageProps> = ({
  src,
  poster,
  clock,
  tourSize,
  maxHeight,
  hotspots,
  suggestions,
  selectedKey,
  selectedSuggestionKey,
  relocating,
  locked,
  tableNumberOf,
  onPlace,
  onRelocate,
  onSelect,
  onMove,
  onSelectSuggestion,
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const drag = useRef<{ key: string; pointerId: number; startX: number; startY: number; origin: Point; moved: boolean } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setBox({ width: rect.width, height: rect.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const natural = clock.naturalSize.width > 0 && clock.naturalSize.height > 0 ? clock.naturalSize : tourSize;
  const content = containRect(box, natural);
  const ratio = natural.width > 0 && natural.height > 0 ? `${natural.width} / ${natural.height}` : '9 / 16';

  const visible = visibleAt(hotspots, clock.time);
  const nearby = suggestedAt(suggestions, clock.time);

  const toNormalized = (clientX: number, clientY: number, clamp: boolean): Point | null => {
    const el = boxRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return pointToNormalized({ x: clientX - rect.left, y: clientY - rect.top }, content, { clamp });
  };

  const onOverlayClick = (event: React.MouseEvent) => {
    if (locked) return;
    const point = toNormalized(event.clientX, event.clientY, false);
    if (!point) return;
    if (relocating) onRelocate(point);
    else onPlace(point);
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        maxHeight,
        backgroundColor: 'var(--scrim)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <video
        ref={clock.videoRef}
        src={src}
        poster={poster || undefined}
        playsInline
        muted
        preload="auto"
        disablePictureInPicture
        {...clock.events}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />

      <div
        role="group"
        aria-label={t("Video kadri. Belgi qo'yish uchun kadrga bosing.")}
        onClick={onOverlayClick}
        style={{ position: 'absolute', inset: 0, cursor: relocating ? 'crosshair' : 'copy', touchAction: 'manipulation' }}
      >
        {suggestions.length > 0 &&
          nearby.map((suggestion) => {
            const point = normalizedToPoint(suggestion, content);
            const selected = suggestion.key === selectedSuggestionKey;
            return (
              <button
                key={suggestion.key}
                type="button"
                aria-label={t('AI taklifi: {label}', { label: suggestion.label || t('stol') })}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectSuggestion(suggestion.key);
                }}
                style={{ ...markerButton(point), cursor: 'pointer' }}
              >
                <span
                  style={{
                    ...circleBase,
                    fontSize: 11,
                    border: '2px dashed var(--text-inverse)',
                    backgroundColor: 'var(--scrim)',
                    boxShadow: selected ? '0 0 0 3px var(--text-inverse), 0 0 0 5px var(--action)' : 'none',
                  }}
                >
                  AI
                </span>
              </button>
            );
          })}

        {visible.map((hotspot) => {
          const point = normalizedToPoint(hotspot, content);
          const number = tableNumberOf(hotspot);
          const selected = hotspot.key === selectedKey;
          return (
            <button
              key={hotspot.key}
              type="button"
              aria-label={number ? t('{number}-stol belgisi', { number }) : t('Stol tanlanmagan belgi')}
              aria-pressed={selected}
              data-marker="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(hotspot.key);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (locked || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { key: hotspot.key, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { x: hotspot.x, y: hotspot.y }, moved: false };
                onSelect(hotspot.key);
              }}
              onPointerMove={(event) => {
                const state = drag.current;
                if (!state || state.pointerId !== event.pointerId) return;
                const dx = event.clientX - state.startX;
                const dy = event.clientY - state.startY;
                if (!state.moved && Math.hypot(dx, dy) < 4) return;
                state.moved = true;
                onMove(state.key, dragTo(state.origin, dx, dy, content));
              }}
              onPointerUp={(event) => {
                if (drag.current?.pointerId === event.pointerId) drag.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 0.05 : 0.01;
                const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                const move = delta[event.key];
                if (!move) return;
                // Strelkalar belgini siljitadi (muharrirdagi ±0.5 s tugmalari ishlamasin)
                event.preventDefault();
                event.stopPropagation();
                if (!locked) onMove(hotspot.key, nudgePoint(hotspot, move[0], move[1]));
              }}
              style={markerButton(point)}
            >
              <span
                style={{
                  ...circleBase,
                  fontSize: number.length > 3 ? 10 : 13,
                  border: '2px solid var(--text-inverse)',
                  backgroundColor: hotspot.table_id === null ? 'var(--accent-rose-solid)' : 'var(--action)',
                  boxShadow: selected ? '0 0 0 3px var(--text-inverse), 0 0 0 5px var(--action)' : 'var(--shadow-md)',
                }}
              >
                {number || '?'}
              </span>
            </button>
          );
        })}
      </div>

      {relocating && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: 8,
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--action)',
            color: 'var(--text-inverse)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {t('Belgi uchun yangi joyni kadrdan tanlang')}
        </div>
      )}

      {clock.failed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'var(--scrim)' }}>
          <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <Notice tone="error">{t("Videoni ochib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.")}</Notice>
            <Button variant="secondary" style={tapButton} onClick={clock.reload}>
              {t('Qayta urinish')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Pastdagi boshqaruv: -0.5 s, o'ynash/to'xtatish, +0.5 s va vaqt */
export const Transport: React.FC<{ clock: VideoClock; disabled?: boolean }> = ({ clock, disabled }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <Button variant="secondary" style={tapButton} disabled={disabled} onClick={() => clock.step(-0.5)} aria-label={t('0,5 soniya orqaga')} icon={<ChevronLeft size={18} aria-hidden="true" />}>
      0.5
    </Button>
    <Button
      style={{ ...tapButton, minWidth: 56 }}
      disabled={disabled}
      onClick={clock.toggle}
      aria-label={clock.playing ? t("To'xtatish") : t("O'ynatish")}
      icon={clock.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
    />
    <Button variant="secondary" style={tapButton} disabled={disabled} onClick={() => clock.step(0.5)} aria-label={t('0,5 soniya oldinga')}>
      0.5
      <ChevronRight size={18} aria-hidden="true" />
    </Button>
    <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }} aria-live="off">
      {formatTime(clock.time)} <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>/ {formatTime(clock.duration)}</span>
    </span>
  </div>
);
