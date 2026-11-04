/**
 * Vaqt formatlash va o'qish. SOF mantiq: hech narsa import qilmaydi.
 * Format: `mm:ss.s` (o'ndan bir soniya aniqligida), masalan 74.25 -> "01:14.3".
 */

/** Yaxlitlash bilan suzuvchi nuqta xatosi (0.1 + 0.2) yo'qoladi */
export const round = (value: number, digits: number): number => {
  const k = 10 ** digits;
  return Math.round((value + Number.EPSILON) * k) / k;
};

/** soniya -> "mm:ss.s". Noto'g'ri yoki manfiy qiymat — "00:00.0". */
export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const tenths = Math.round(safe * 10);
  const minutes = Math.floor(tenths / 600);
  const secs = Math.floor((tenths % 600) / 10);
  const tenth = tenths % 10;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenth}`;
}

/** Butun soniyalarda qisqa davomiylik: 44.6 -> "0:45", 125 -> "2:05" (ro'yxat kartochkalari uchun). */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * Foydalanuvchi yozgan vaqtni soniyaga aylantiradi; tushunarsiz bo'lsa null.
 * Qabul qilinadi: "12", "12.5", "12,5", "0:12", "01:12.5", "1:02:03", " 12 s ".
 * Qabul qilinmaydi: bo'sh, manfiy, "1:75" (soniya < 60 bo'lishi shart), harfli matn.
 */
export function parseTime(text: string): number | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.trim().toLowerCase().replace(/\s*(s|sec|с)$/u, '').replace(',', '.').trim();
  if (cleaned === '') return null;

  const plain = /^(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (plain) return Number(cleaned);

  const parts = /^(\d+):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?$/.exec(cleaned);
  if (!parts) return null;
  const [, first, second, third, fraction] = parts;
  const fractionValue = fraction ? Number(`0.${fraction}`) : 0;
  if (third !== undefined) {
    // soat:daqiqa:soniya
    const hours = Number(first);
    const minutes = Number(second);
    const secs = Number(third);
    if (minutes >= 60 || secs >= 60) return null;
    return hours * 3600 + minutes * 60 + secs + fractionValue;
  }
  const minutes = Number(first);
  const secs = Number(second);
  if (secs >= 60) return null;
  return minutes * 60 + secs + fractionValue;
}

/** Vaqtni [0, duration] ichiga soladi (duration noma'lum/0 bo'lsa faqat pastki chegara) */
export function clampTime(value: number, duration: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (Number.isFinite(duration) && duration > 0 && value > duration) return duration;
  return value;
}

/** Vaqtni delta bilan siljitadi (chegaralar ichida, 0.01 s ga yaxlitlangan: 0.1 + 0.2 muammosi yo'q) */
export function stepTime(current: number, delta: number, duration: number): number {
  return round(clampTime(current + delta, duration), 2);
}

/** Slayderdagi bosish joyi (px) -> vaqt. `left`/`width` — slayder chizig'ining ekrandagi o'rni. */
export function pointerToTime(clientX: number, left: number, width: number, duration: number): number {
  if (!(width > 0) || !(duration > 0)) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
  return round(ratio * duration, 2);
}

/** Vaqt -> slayderdagi o'rni, 0..1 */
export function timeToRatio(value: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / duration));
}
