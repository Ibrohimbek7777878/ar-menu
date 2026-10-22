/**
 * Bitta umumiy AudioContext (TZ: R5-5).
 *
 * Avval har signalda `new AudioContext()` yaratilardi va yopilmasdi: brauzer bir sahifada ~6 ta kontekstdan ortig'iga
 * ruxsat bermaydi, shuning uchun band kechada KDS ovozi jimgina o'chib qolardi. Bu yerda kontekst bitta, kerak bo'lsa
 * (foydalanuvchi sahifa bilan ishlagach) davom ettiriladi.
 */
let sharedContext: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedContext && sharedContext.state !== 'closed') return sharedContext;
  const Ctor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
}

/** Ketma-ket tovushlar: har biri [chastota Hz, boshlanish kechikishi soniya]; umumiy davomiylik durationSec. */
export function playTones(tones: Array<[number, number]>, durationSec = 0.35, volume = 0.12): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    for (const [freq, delay] of tones) osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // Autoplay siyosati: foydalanuvchi sahifa bilan ishlamaguncha ovoz bo'lmasligi mumkin
  }
}

/** Ekran o'chib qolmasligi uchun (KDS devorda turadi). Qo'llab-quvvatlanmasa — hech narsa qilmaydi. */
export async function keepScreenAwake(): Promise<() => void> {
  type WakeLockApi = { request: (type: 'screen') => Promise<{ release: () => Promise<void>; released: boolean }> };
  const wakeLock = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock;
  if (!wakeLock) return () => {};
  let sentinel: Awaited<ReturnType<WakeLockApi['request']>> | null = null;
  let stopped = false;
  const acquire = async () => {
    try {
      if (!stopped && document.visibilityState === 'visible') sentinel = await wakeLock.request('screen');
    } catch {
      sentinel = null;       // batareya tejash rejimi va h.k. — jim o'tkaziladi
    }
  };
  const onVisible = () => { if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire(); };
  document.addEventListener('visibilitychange', onVisible);
  await acquire();
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisible);
    void sentinel?.release().catch(() => {});
  };
}
