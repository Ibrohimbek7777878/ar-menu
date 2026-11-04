// Sayr boshqaruvi: ◀ Orqaga / Oldinga ▶ (ushlab turilsa uzluksiz yuradi), "Sayrni boshlash" (avtoyurish), nuqtalar (boblar) lentasi.
import React, { useEffect, useRef } from 'react';
import { fxEnabled } from '../../motion/env';
import { t } from '../../i18n';
import { stopTitle } from './labels';
import { TourIcon } from './TourIcon';
import type { TourStop } from './types';

interface HoldButtonProps {
  dir: 1 | -1;
  label: string;
  disabled: boolean;
  onHoldStart: (dir: 1 | -1) => void;
  onHoldEnd: () => void;
  onStep: (dir: 1 | -1) => void;
}

/**
 * Ushlab turib yurish: bosilganda bir qadam, ~0,2 s dan keyin tezlashib uzluksiz. Sichqoncha/barmoq (pointer) va klaviatura
 * (Enter/Space = bir qadam) alohida yo'llar: `detail === 0` faqat klaviatura bosishi, shuning uchun qo'sh qadam bo'lmaydi.
 */
const HoldButton: React.FC<HoldButtonProps> = ({ dir, label, disabled, onHoldStart, onHoldEnd, onStep }) => (
  <button
    type="button"
    className={`tr-btn tr-hold tr-hold--${dir > 0 ? 'fwd' : 'back'}`}
    aria-label={label}
    title={label}
    disabled={disabled}
    onPointerDown={(e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer allaqachon tugagan */
      }
      onHoldStart(dir);
    }}
    onPointerUp={onHoldEnd}
    onPointerCancel={onHoldEnd}
    onLostPointerCapture={onHoldEnd}
    onClick={(e) => {
      if (e.detail === 0) onStep(dir);
    }}
    onContextMenu={(e) => e.preventDefault()}
  >
    {dir < 0 && <TourIcon name="prev" size={22} />}
    <span className="tr-hold-text">{dir < 0 ? t('Orqaga') : t('Oldinga')}</span>
    {dir > 0 && <TourIcon name="next" size={22} />}
  </button>
);

interface TourControlsProps {
  stops: readonly TourStop[];
  stopIndex: number;
  hasPrev: boolean;
  hasNext: boolean;
  auto: boolean;
  /** Video hali tayyor emas */
  disabled: boolean;
  onHoldStart: (dir: 1 | -1) => void;
  onHoldEnd: () => void;
  onStep: (dir: 1 | -1) => void;
  onJump: (time: number) => void;
  onPrevStop: () => void;
  onNextStop: () => void;
  onToggleAuto: () => void;
}

export const TourControls: React.FC<TourControlsProps> = ({
  stops, stopIndex, hasPrev, hasNext, auto, disabled, onHoldStart, onHoldEnd, onStep, onJump, onPrevStop, onNextStop, onToggleAuto,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Joriy nuqta chipi lentaning o'rtasiga keladi (sahifa emas, faqat lentaning o'zi suriladi)
  useEffect(() => {
    const box = scrollRef.current;
    const chip = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!box || !chip) return;
    const left = chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: fxEnabled() ? 'smooth' : 'auto' });
  }, [stopIndex]);

  return (
    <div className="tr-controls">
      <div className="tr-walk">
        <HoldButton dir={-1} label={t('Orqaga yurish')} disabled={disabled} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} onStep={onStep} />
        <button type="button" className="tr-btn tr-btn--primary tr-auto" onClick={onToggleAuto} disabled={disabled} aria-pressed={auto}>
          <TourIcon name={auto ? 'pause' : 'play'} size={18} />
          <span>{auto ? t("Sayrni to'xtatish") : t('Sayrni boshlash')}</span>
        </button>
        <HoldButton dir={1} label={t('Oldinga yurish')} disabled={disabled} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} onStep={onStep} />
      </div>

      {stops.length > 0 && (
        <div className="tr-stops" role="group" aria-label={t('Sayr nuqtalari')}>
          <button type="button" className="tr-icon-btn" onClick={onPrevStop} disabled={disabled || !hasPrev} aria-label={t('Oldingi nuqta')}>
            <TourIcon name="prev" size={18} />
          </button>
          <div className="tr-stops-scroll" ref={scrollRef}>
            {stops.map((stop, index) => (
              <button
                key={stop.id}
                type="button"
                className={`tr-chip ${index === stopIndex ? 'is-on' : ''}`}
                aria-current={index === stopIndex ? 'true' : undefined}
                disabled={disabled}
                onClick={() => onJump(stop.time)}
              >
                {stopTitle(stop, index)}
              </button>
            ))}
          </div>
          <button type="button" className="tr-icon-btn" onClick={onNextStop} disabled={disabled || !hasNext} aria-label={t('Keyingi nuqta')}>
            <TourIcon name="next" size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
