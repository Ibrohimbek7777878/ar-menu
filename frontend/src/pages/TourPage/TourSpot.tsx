// Videodagi stol belgisi: raqamli doira + yumshoq puls ("bosing" ishorasi). Bosiladigan maydon kamida 44x44 px (CSS).
import React, { useEffect, useRef } from 'react';
import { pulseLoop } from '../../motion/fx';
import { spotAria } from './labels';
import type { TourHotspot } from './types';

interface TourSpotProps {
  spot: TourHotspot;
  /** Sahna ichidagi markaz (px) */
  left: number;
  top: number;
  onOpen: (spot: TourHotspot, opener: HTMLElement) => void;
}

export const TourSpot: React.FC<TourSpotProps> = ({ spot, left, top, onOpen }) => {
  const pulseRef = useRef<HTMLSpanElement>(null);

  // Puls: `fxEnabled()` (motion/fx.ts) o'chiq bo'lsa (animatsiya o'chirilgan / harakatni kamaytirish) hech narsa qilmaydi
  useEffect(() => {
    const animation = pulseLoop(pulseRef.current);
    return () => animation?.cancel();
  }, []);

  return (
    <button type="button" className="tr-spot" style={{ left, top }} aria-label={spotAria(spot)} onClick={(e) => onOpen(spot, e.currentTarget)}>
      <span className="tr-spot-pulse" ref={pulseRef} aria-hidden="true" />
      <span className="tr-spot-dot tabular-nums" aria-hidden="true">{spot.tableNumber || '•'}</span>
    </button>
  );
};
