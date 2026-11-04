import { useCallback, useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import type { Size } from './geometry';
import { clampTime, round, stepTime } from './time';

/** Video joriy vaqti o'zgarganda holat shu oraliqdan tez yangilanmaydi (ms): qayta chizish yengil qolsin */
const TICK_MS = 66;

/**
 * `<video>` ni boshqaradi: joriy vaqt, o'ynash, sakrash. Vaqt o'ynash paytida ~15 marta/soniya yangilanadi,
 * sakrashda (slayder, tugma, klaviatura) darrov.
 */
export function useVideoClock(knownDuration: number) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);

  const duration = knownDuration > 0 ? knownDuration : mediaDuration;
  const durationRef = useRef(duration);
  const timeRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const commit = useCallback((next: number) => {
    timeRef.current = next;
    setTime(next);
  }, []);

  // O'ynash davomida vaqtni tekis yangilash
  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      const video = videoRef.current;
      if (video && now - last >= TICK_MS) {
        last = now;
        commit(video.currentTime);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, commit]);

  const seek = useCallback(
    (to: number) => {
      const next = round(clampTime(to, durationRef.current), 2);
      const video = videoRef.current;
      if (video) video.currentTime = next;
      commit(next);
    },
    [commit],
  );

  const step = useCallback((delta: number) => seek(stepTime(timeRef.current, delta, durationRef.current)), [seek]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const reload = useCallback(() => {
    setFailed(false);
    videoRef.current?.load();
  }, []);

  /** `<video>` ga beriladigan hodisalar */
  const events = {
    onPlay: () => setPlaying(true),
    onPause: (event: SyntheticEvent<HTMLVideoElement>) => {
      setPlaying(false);
      commit(event.currentTarget.currentTime);
    },
    onEnded: (event: SyntheticEvent<HTMLVideoElement>) => {
      setPlaying(false);
      commit(event.currentTarget.currentTime);
    },
    onSeeked: (event: SyntheticEvent<HTMLVideoElement>) => {
      if (!event.currentTarget.seeking) commit(event.currentTarget.currentTime);
    },
    onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      setFailed(false);
      if (Number.isFinite(video.duration) && video.duration > 0) setMediaDuration(video.duration);
      setNaturalSize({ width: video.videoWidth, height: video.videoHeight });
    },
    onError: () => setFailed(true),
  };

  return { videoRef, time, timeRef, playing, duration, naturalSize, failed, events, seek, step, pause, toggle, reload };
}

export type VideoClock = ReturnType<typeof useVideoClock>;
