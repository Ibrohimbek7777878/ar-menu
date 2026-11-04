// Sayr ijrosi uchun React ulagichi: <video> ga player (harakat) va media loader (yuklash) ulaydi, kerakli holatni qaytaradi.
// Kadr tezligidagi o'zgarishlar (progress chizig'i) React'siz, to'g'ridan-to'g'ri DOM'ga yoziladi; React faqat ma'noli o'zgarishda
// (nuqta almashdi, ko'rinadigan belgilar to'plami o'zgardi, holat almashdi) qayta chiziladi.
import { useEffect, useMemo, useRef, useState } from 'react';
import { fxEnabled } from '../../motion/env';
import type { AutoState } from './autoplay';
import { createMediaLoader, type MediaStatus, type UpgradeState } from './media';
import type { VariantPlan } from './network';
import { createPlayer, type Player } from './player';
import { readResume, saveResume } from './resume';
import { currentStopIndex, hotspotSignature, nearestHotspotDirection, nextStop, prevStop, visibleHotspots } from './stops';
import type { Size, TourData, TourHotspot, VariantKey } from './types';

export interface PlaybackView {
  status: MediaStatus;
  variant: VariantKey | null;
  upgrade: { state: UpgradeState; progress: number };
  slow: boolean;
  /** Video haqiqiy o'lchami (metama'lumotdan); 0 — noma'lum */
  videoSize: Size;
  auto: AutoState['mode'];
  stopIndex: number;
  /** Oldinda/orqada nuqta bormi (strelkalarni o'chirish uchun) */
  hasPrev: boolean;
  hasNext: boolean;
  visible: TourHotspot[];
  visibleSig: string;
  /** Belgi ko'rinmasa: eng yaqin belgi qaysi tomonda */
  hintDir: 'forward' | 'back' | null;
}

export interface PlaybackApi {
  dragStart(): void;
  dragTo(deltaSeconds: number): void;
  dragEnd(velocity: number): void;
  holdStart(dir: 1 | -1): void;
  holdEnd(): void;
  step(deltaSeconds: number): void;
  nudge(deltaSeconds: number): void;
  jumpTo(time: number): void;
  toggleAuto(): void;
  interrupt(): void;
  upgradeNow(): void;
  time(): number;
}

interface Params {
  tour: TourData;
  plan: VariantPlan;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  freezeRef: React.RefObject<HTMLCanvasElement | null>;
  progressRef: React.RefObject<HTMLElement | null>;
}

const INITIAL: PlaybackView = {
  status: 'loading',
  variant: null,
  upgrade: { state: 'idle', progress: 0 },
  slow: false,
  videoSize: { width: 0, height: 0 },
  auto: 'idle',
  stopIndex: -1,
  hasPrev: false,
  hasNext: false,
  visible: [],
  visibleSig: '',
  hintDir: null,
};

export function useTourPlayback({ tour, plan, videoRef, freezeRef, progressRef }: Params): { view: PlaybackView; api: PlaybackApi } {
  const [view, setView] = useState<PlaybackView>(INITIAL);
  const playerRef = useRef<Player | null>(null);
  const loaderRef = useRef<ReturnType<typeof createMediaLoader> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let duration = tour.duration;
    let readyOnce = false;
    video.muted = true;

    const patch = setView;

    const player = createPlayer({
      video,
      stops: () => tour.stops,
      duration: () => duration,
      smooth: fxEnabled,
      onFrame: ({ time, auto }) => {
        const bar = progressRef.current;
        if (bar && duration > 0) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, time / duration))})`;
        const visible = visibleHotspots(tour.hotspots, time);
        const sig = hotspotSignature(visible);
        const stopIndex = currentStopIndex(tour.stops, time);
        const hasPrev = prevStop(tour.stops, time) !== null;
        const hasNext = nextStop(tour.stops, time) !== null;
        const hintDir = visible.length ? null : nearestHotspotDirection(tour.hotspots, time);
        patch((v) =>
          v.visibleSig === sig && v.stopIndex === stopIndex && v.auto === auto && v.hasPrev === hasPrev && v.hasNext === hasNext && v.hintDir === hintDir
            ? v
            : { ...v, visible, visibleSig: sig, stopIndex, auto, hasPrev, hasNext, hintDir },
        );
      },
    });

    const loader = createMediaLoader({
      video,
      urls: { scrub: tour.video.scrub, play: tour.video.play, low: tour.video.low },
      plan,
      events: {
        onStatus: (status, variant) => {
          patch((v) => ({ ...v, status, variant }));
          if (status === 'ready' && !readyOnce) {
            readyOnce = true;
            const resume = readResume(duration);
            if (resume !== null) player.seekTo(resume);
            else player.wake();
          }
        },
        onUpgrade: (state, progress) => patch((v) => (v.upgrade.state === state && v.upgrade.progress === progress ? v : { ...v, upgrade: { state, progress } })),
        onSlow: () => patch((v) => (v.status === 'loading' ? { ...v, slow: true } : v)),
        onMetadata: (info) => {
          if (info.duration > 0) duration = info.duration;
          if (info.width > 0 && info.height > 0) {
            patch((v) => (v.videoSize.width === info.width && v.videoSize.height === info.height ? v : { ...v, videoSize: { width: info.width, height: info.height } }));
          }
        },
      },
      hooks: {
        time: () => player.time(),
        suspend: () => player.suspend(),
        resume: () => player.resume(),
        autoActive: () => {
          const mode = player.autoMode();
          return mode === 'playing' || mode === 'holding';
        },
        freeze: (on) => {
          const canvas = freezeRef.current;
          if (!canvas) return;
          if (!on) {
            canvas.style.visibility = 'hidden';
            return;
          }
          try {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext('2d')?.drawImage(video, 0, 0);
              canvas.style.visibility = 'visible';
            }
          } catch {
            canvas.style.visibility = 'hidden';
          }
        },
      },
    });

    playerRef.current = player;
    loaderRef.current = loader;
    loader.start();

    const onVisible = () => {
      if (!document.hidden) player.wake();
    };
    const onPageHide = () => {
      if (readyOnce) saveResume(player.time(), duration);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onPageHide);
      // Joyni faqat video haqiqatan ochilgan bo'lsa eslab qolamiz (yuklanmay turib chiqilsa avvalgi yozuv o'chib ketmasin)
      if (readyOnce) saveResume(player.time(), duration);
      loader.destroy();
      player.destroy();
      playerRef.current = null;
      loaderRef.current = null;
    };
  }, [tour, plan, videoRef, freezeRef, progressRef]);

  const api = useMemo<PlaybackApi>(
    () => ({
      dragStart: () => playerRef.current?.dragStart(),
      dragTo: (d) => playerRef.current?.dragTo(d),
      dragEnd: (v) => playerRef.current?.dragEnd(v),
      holdStart: (dir) => playerRef.current?.holdStart(dir),
      holdEnd: () => playerRef.current?.holdEnd(),
      step: (d) => playerRef.current?.step(d),
      nudge: (d) => playerRef.current?.nudge(d),
      jumpTo: (time) => playerRef.current?.jumpTo(time),
      toggleAuto: () => playerRef.current?.toggleAuto(),
      interrupt: () => playerRef.current?.interrupt(),
      upgradeNow: () => loaderRef.current?.upgradeNow(),
      time: () => playerRef.current?.time() ?? 0,
    }),
    [],
  );

  return { view, api };
}
