// Sayr sahnasi: to'liq ekran video, sudrab/tugma/klaviatura bilan yurish, nuqtalar, vaqt oralig'idagi stol belgilari va stol kartochkasi.
// Mantiq sof modullarda (geometry, motion, stops, autoplay, seeker, player, media, network); bu fayl faqat ularni ulaydi va chizadi.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { moduleEnabled } from '../../utils/brand';
import { tm } from '../../utils/brandText';
import { rippleRings } from '../../motion/fx';
import { chooseFit, fitFrame, placeHotspot } from './geometry';
import { dragDeltaSeconds, estimateVelocity, pastSlop, wheelDeltaSeconds, MOTION, type Sample } from './motion';
import type { VariantPlan } from './network';
import { bookingPathForTable } from './paths';
import { nextStop, prevStop, stopByDigit, tableEntries } from './stops';
import { TableCard } from './TableCard';
import { TableList } from './TableList';
import { TourControls } from './TourControls';
import { TourFallback } from './TourFallback';
import { TourIcon } from './TourIcon';
import { TourSheet } from './TourSheet';
import { TourSpot } from './TourSpot';
import type { TourData, TourHotspot } from './types';
import { useElementSize } from './useTour';
import { useTourPlayback } from './useTourPlayback';

interface TourSceneProps {
  tour: TourData;
  plan: VariantPlan;
  /** Video ochilmadi -> zaxira ko'rinishdagi "Qayta urinish" */
  onRetry: () => void;
}

interface DragState {
  pointerId: number;
  x0: number;
  y0: number;
  active: boolean;
  samples: Sample[];
}

const FORWARD_KEYS = ['w', 'd', 'ArrowUp', 'ArrowRight'];
const BACK_KEYS = ['s', 'a', 'ArrowDown', 'ArrowLeft'];

export const TourScene: React.FC<TourSceneProps> = ({ tour, plan, onRetry }) => {
  const { navigate } = useNavigation();
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const freezeRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickUntil = useRef(0);

  const stageSize = useElementSize(stageRef);
  const { view, api } = useTourPlayback({ tour, plan, videoRef, freezeRef, progressRef });
  const [interacted, setInteracted] = useState(false);
  const [sheetSpot, setSheetSpot] = useState<TourHotspot | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const modalOpen = sheetSpot !== null || listOpen;
  const ready = view.status === 'ready';
  const entries = useMemo(() => tableEntries(tour.hotspots), [tour.hotspots]);
  const menuOn = moduleEnabled('menu');

  // Kadr: video kontenti sahnaning qaysi to'rtburchagini egallaydi (belgilar aynan shunga nisbatan joylanadi)
  const knownSize = view.videoSize.width > 0 && view.videoSize.height > 0;
  const videoW = knownSize ? view.videoSize.width : tour.width;
  const videoH = knownSize ? view.videoSize.height : tour.height;
  const fit = useMemo(() => chooseFit(stageSize, { width: videoW, height: videoH }, tour.hotspots), [stageSize, videoW, videoH, tour.hotspots]);
  const frame = useMemo(() => fitFrame(stageSize, { width: videoW, height: videoH }, fit), [stageSize, videoW, videoH, fit]);

  const touched = useCallback(() => setInteracted(true), []);

  // ── Modal oynalar ──
  const closeModal = useCallback(() => {
    setSheetSpot(null);
    setListOpen(false);
    const opener = openerRef.current;
    window.setTimeout(() => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    }, 0);
  }, []);
  const openSpot = useCallback(
    (spot: TourHotspot, opener: HTMLElement) => {
      if (performance.now() < suppressClickUntil.current) return; // sudrash tugagan paytdagi tasodifiy "bosish"
      api.interrupt();
      rippleRings(opener, 1);
      openerRef.current = opener;
      setSheetSpot(spot);
    },
    [api],
  );
  const openList = (event: React.MouseEvent<HTMLElement>) => {
    api.interrupt();
    openerRef.current = event.currentTarget;
    setListOpen(true);
  };
  const book = useCallback(
    (tableId: number) => {
      api.interrupt();
      navigate(bookingPathForTable(tableId));
    },
    [api, navigate],
  );

  // ── Sudrab surish (pointer): slop dan keyin boshlanadi, shunda belgiga oddiy bosish ham ishlaydi ──
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragRef.current = { pointerId: event.pointerId, x0: event.clientX, y0: event.clientY, active: false, samples: [] };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active) {
      if (!pastSlop(event.clientX - drag.x0, event.clientY - drag.y0)) return;
      drag.active = true;
      drag.x0 = event.clientX; // slop dan o'tgan joydan hisoblanadi: sakrash yo'q
      drag.y0 = event.clientY;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* pointer allaqachon tugagan */
      }
      touched();
      api.dragStart();
    }
    const delta = dragDeltaSeconds(event.clientX - drag.x0, event.clientY - drag.y0, stageSize);
    drag.samples.push({ at: performance.now(), value: delta });
    if (drag.samples.length > 12) drag.samples.shift();
    api.dragTo(delta);
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.active) return;
    suppressClickUntil.current = performance.now() + 150;
    api.dragEnd(event.type === 'pointercancel' ? 0 : estimateVelocity(drag.samples, performance.now()));
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!ready || modalOpen) return;
    const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    touched();
    api.nudge(wheelDeltaSeconds(pixels));
  };

  // ── Klaviatura: W/↑/→/D oldinga, S/↓/←/A orqaga (ushlab turilsa yuradi), bo'sh joy — avtoyurish, 1–9 — nuqtaga ──
  useEffect(() => {
    if (!ready || modalOpen) return undefined;
    const held = new Set<string>();
    let dir: 0 | 1 | -1 = 0;
    const sync = () => {
      const fwd = [...held].some((k) => FORWARD_KEYS.includes(k));
      const back = [...held].some((k) => BACK_KEYS.includes(k));
      const next: 0 | 1 | -1 = fwd === back ? 0 : fwd ? 1 : -1;
      if (next === dir) return;
      dir = next;
      if (next === 0) api.holdEnd();
      else api.holdStart(next);
    };
    const keyOf = (event: KeyboardEvent) => (event.key.length === 1 ? event.key.toLowerCase() : event.key);
    const onDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const key = keyOf(event);
      if (FORWARD_KEYS.includes(key) || BACK_KEYS.includes(key)) {
        event.preventDefault();
        if (event.repeat) return;
        held.add(key);
        touched();
        sync();
      } else if (key === ' ') {
        // Tugma/havola fokusda bo'lsa bo'sh joy uning o'z amalini bajaradi
        if (target?.closest('button, a, [role="button"]')) return;
        event.preventDefault();
        if (event.repeat) return;
        touched();
        api.toggleAuto();
      } else if (/^[1-9]$/.test(key)) {
        const stop = stopByDigit(tour.stops, Number(key));
        if (stop) {
          event.preventDefault();
          touched();
          api.jumpTo(stop.time);
        }
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (held.delete(keyOf(event))) sync();
    };
    const release = () => {
      held.clear();
      sync();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [ready, modalOpen, api, tour.stops, touched]);

  // ── Tugmalar ──
  const hold = useCallback(
    (dir: 1 | -1) => {
      touched();
      api.holdStart(dir);
    },
    [api, touched],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      touched();
      api.step(dir * MOTION.TAP_STEP_SECONDS);
    },
    [api, touched],
  );
  const jump = useCallback(
    (time: number) => {
      touched();
      api.jumpTo(time);
    },
    [api, touched],
  );
  const goPrev = useCallback(() => {
    const stop = prevStop(tour.stops, api.time());
    if (stop) jump(stop.time);
  }, [tour.stops, api, jump]);
  const goNext = useCallback(() => {
    const stop = nextStop(tour.stops, api.time());
    if (stop) jump(stop.time);
  }, [tour.stops, api, jump]);
  const toggleAuto = useCallback(() => {
    touched();
    api.toggleAuto();
  }, [api, touched]);

  if (view.status === 'failed') return <TourFallback tour={tour} reason="failed" onRetry={onRetry} />;

  const autoOn = view.auto === 'playing' || view.auto === 'holding';
  const hint = !ready
    ? null
    : !interacted
      ? t("Yurish uchun ekranni sudrang yoki Oldinga / Orqaga tugmalarini bosing")
      : view.visible.length
        ? tm(t('Stolni tanlash uchun raqamli belgiga bosing'))
        : view.hintDir === 'forward'
          ? tm(t("Stollarni ko'rish uchun oldinga yuring"))
          : view.hintDir === 'back'
            ? tm(t("Stollarni ko'rish uchun orqaga qayting"))
            : null;
  const upgradeBusy = view.upgrade.state === 'loading' || view.upgrade.state === 'swapping';
  const percent = view.upgrade.progress >= 0 ? Math.round(view.upgrade.progress * 100) : -1;
  const offerUpgrade = ready && plan.saver !== null && plan.upgradeOnDemand !== null && view.upgrade.state === 'idle';
  const hall = tour.title;
  const currentStop = view.stopIndex >= 0 ? tour.stops[view.stopIndex] : undefined;

  return (
    <div className="tr-root" data-status={view.status} data-auto={view.auto}>
      <div
        className="tr-stage"
        ref={stageRef}
        role="region"
        aria-label={t('Zal sayri')}
        aria-describedby="tr-help"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="tr-frame" data-ready={ready} style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}>
          {tour.video.poster && <img className="tr-poster" src={tour.video.poster} alt="" decoding="async" draggable={false} />}
          <video ref={videoRef} className="tr-video" muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} disablePictureInPicture disableRemotePlayback />
          <canvas ref={freezeRef} className="tr-freeze" aria-hidden="true" />
        </div>
        <div className="tr-spots">
          {ready &&
            view.visible.map((spot) => {
              const pos = placeHotspot(frame, stageSize, spot.x, spot.y);
              return <TourSpot key={spot.id} spot={spot} left={pos.left} top={pos.top} onOpen={openSpot} />;
            })}
        </div>
      </div>

      <div className="tr-top">
        <button type="button" className="tr-pill tr-pill--btn" onClick={() => navigate(menuOn ? '/menu/' : '/')}>
          <TourIcon name="back" size={18} />
          <span className="tr-label">{menuOn ? t('Menyuga') : t('Bosh sahifaga')}</span>
        </button>
        <h1 className="tr-top-title">{tour.title || t('Zal sayri')}</h1>
        <button type="button" className="tr-pill tr-pill--btn" onClick={openList}>
          <TourIcon name="list" size={18} />
          <span className="tr-label">{t("Stollar ro'yxati")}</span>
        </button>
      </div>

      {!ready && (
        <div className="tr-loading" role="status">
          <span className="tr-spinner" aria-hidden="true"><TourIcon name="spin" size={30} /></span>
          <strong>{t('Zal tayyorlanmoqda...')}</strong>
          <span className="tr-loading-bar" aria-hidden="true"><i /></span>
          {view.slow && (
            <>
              <span className="tr-loading-note">{tm(t("Internet sekin. Stolni ro'yxatdan ham tanlashingiz mumkin."))}</span>
              <button type="button" className="tr-btn tr-btn--light tr-btn--small" onClick={openList}>{t("Stollar ro'yxati")}</button>
            </>
          )}
        </div>
      )}

      {ready && (upgradeBusy || offerUpgrade) && (
        <div className="tr-notice" role="status">
          {upgradeBusy ? (
            <span className="tr-pill">
              <span className="tr-spinner tr-spinner--small" aria-hidden="true"><TourIcon name="spin" size={14} /></span>
              {percent >= 0 ? t('Silliq yurish tayyorlanmoqda... {n}%', { n: percent }) : t('Silliq yurish tayyorlanmoqda...')}
            </span>
          ) : (
            <span className="tr-pill">
              <span>{plan.saver === 'save-data' ? t("Ma'lumot tejash yoqilgan: yengil video") : t('Internet sekin: yengil video')}</span>
              <button type="button" className="tr-pill-action" onClick={() => api.upgradeNow()}>{t('Yuqori sifat')}</button>
            </span>
          )}
        </div>
      )}

      <div className="tr-bottom">
        {hint && <p className="tr-hint" key={hint}>{hint}</p>}
        <TourControls
          stops={tour.stops}
          stopIndex={view.stopIndex}
          hasPrev={view.hasPrev}
          hasNext={view.hasNext}
          auto={autoOn}
          disabled={!ready}
          onHoldStart={hold}
          onHoldEnd={api.holdEnd}
          onStep={step}
          onJump={jump}
          onPrevStop={goPrev}
          onNextStop={goNext}
          onToggleAuto={toggleAuto}
        />
        <div className="tr-progress" aria-hidden="true"><div className="tr-progress-fill" ref={progressRef} /></div>
      </div>

      {sheetSpot && <TableCard spot={sheetSpot} hall={hall} onBook={book} onClose={closeModal} />}
      {listOpen && (
        <TourSheet title={t("Stollar ro'yxati")} subtitle={hall || undefined} onClose={closeModal}>
          <TableList
            entries={entries}
            onSeek={ready ? (time) => { closeModal(); jump(time); } : undefined}
            onBook={book}
          />
        </TourSheet>
      )}

      <p id="tr-help" className="tr-sr">
        {t("Klaviatura: W, A, S, D yoki strelkalar bilan yuring, bo'sh joy — avtoyurish, 1–9 — nuqtaga o'tish. Ekranni sudrab ham yurish mumkin.")}
      </p>
      <p className="tr-sr" role="status" aria-live="polite">{currentStop ? t('Hozir: {name}', { name: currentStop.title || t('Nuqta {n}', { n: view.stopIndex + 1 }) }) : ''}</p>
    </div>
  );
};
