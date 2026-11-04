/**
 * Video kadri geometriyasi. SOF mantiq: hech narsa import qilmaydi.
 *
 * `<video style="object-fit: contain">` ichida kontent qutini to'liq to'ldirmasligi mumkin (yon yoki tepa-past chiziqlar).
 * Belgilar koordinatalari (x, y) kadrning HAQIQIY ko'rinadigan maydoniga nisbatan 0..1 bo'lishi shart: aks holda mehmon ekrani
 * (boshqa o'lcham) belgini boshqa joyda ko'rsatadi. Shu fayl: kontent to'rtburchagi, bosish -> 0..1, 0..1 -> piksel, sudrash.
 */

export interface Size {
  width: number;
  height: number;
}

/** Quti ichidagi to'rtburchak (quti chap-yuqori burchagiga nisbatan, px) */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const positive = (value: number): boolean => Number.isFinite(value) && value > 0;

export const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** 0.0001 aniqlik (belgi uchun yetarli, saqlashda uzun kasr chiqmasin) */
export const round4 = (value: number): number => Math.round((value + Number.EPSILON) * 10000) / 10000;

/**
 * `object-fit: contain` bo'yicha video kontenti egallaydigan to'rtburchak.
 * Video o'lchami noma'lum (0/NaN) bo'lsa — butun quti (chiziqsiz deb hisoblanadi).
 */
export function containRect(box: Size, video: Size): Rect {
  const boxW = positive(box.width) ? box.width : 0;
  const boxH = positive(box.height) ? box.height : 0;
  if (!boxW || !boxH) return { left: 0, top: 0, width: boxW, height: boxH };
  if (!positive(video.width) || !positive(video.height)) return { left: 0, top: 0, width: boxW, height: boxH };
  const scale = Math.min(boxW / video.width, boxH / video.height);
  const width = video.width * scale;
  const height = video.height * scale;
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height };
}

/**
 * Qutiga nisbatan nuqta (px) -> kontentga nisbatan 0..1.
 * Kontentdan tashqarida (chiziqlar ustida) — null; `clamp: true` bo'lsa (sudrash) chegaraga siqiladi.
 * `tolerance` — kontent chetidan shuncha px tashqarida ham "ichkarida" hisoblanadi (barmoq xatosi).
 */
export function pointToNormalized(point: Point, content: Rect, options: { clamp?: boolean; tolerance?: number } = {}): Point | null {
  if (!positive(content.width) || !positive(content.height)) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const tolerance = options.tolerance ?? 0.5;
  const nx = (point.x - content.left) / content.width;
  const ny = (point.y - content.top) / content.height;
  if (!options.clamp) {
    const tx = tolerance / content.width;
    const ty = tolerance / content.height;
    if (nx < -tx || nx > 1 + tx || ny < -ty || ny > 1 + ty) return null;
  }
  return { x: round4(clamp01(nx)), y: round4(clamp01(ny)) };
}

/** Kontentga nisbatan 0..1 -> qutiga nisbatan piksel (belgini chizish uchun) */
export function normalizedToPoint(normalized: Point, content: Rect): Point {
  return { x: content.left + clamp01(normalized.x) * content.width, y: content.top + clamp01(normalized.y) * content.height };
}

/** Sudrash: boshlang'ich 0..1 joydan dx, dy (px) siljitilgan joy, 0..1 ga siqilgan */
export function dragTo(start: Point, dx: number, dy: number, content: Rect): Point {
  if (!positive(content.width) || !positive(content.height)) return { x: clamp01(start.x), y: clamp01(start.y) };
  return { x: round4(clamp01(start.x + dx / content.width)), y: round4(clamp01(start.y + dy / content.height)) };
}

/** Klaviatura bilan siljitish (strelkalar): 0..1 da `step` qadam, chegarada to'xtaydi */
export function nudgePoint(start: Point, dx: number, dy: number): Point {
  return { x: round4(clamp01(start.x + dx)), y: round4(clamp01(start.y + dy)) };
}
