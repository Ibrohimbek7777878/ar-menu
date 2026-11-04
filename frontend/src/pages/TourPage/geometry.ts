// Video kadri va belgilar geometriyasi (sof). Sahna (stage) — ekrandagi to'liq maydon; kadr (frame) — video kontenti egallagan to'rtburchak
// (sahna koordinatalarida, `contain` bo'lsa sahnadan kichik, `cover` bo'lsa katta). Belgilar (x, y: 0..1) aynan kadrga nisbatan joylanadi.
import type { Rect, Size } from './types.ts'

export type FitMode = 'contain' | 'cover'

/** `cover` faqat kadrning shuncha qismidan ko'pi qirqilmasa tanlanadi (aks holda stollar chetga chiqib ketadi) */
export const COVER_MAX_CROP = 0.15
/** `cover` da ham belgilar ko'rinadigan oynaning chetidan kamida shuncha (0..1) ichkarida bo'lishi shart */
export const COVER_HOTSPOT_MARGIN = 0.06
/** Belgi markazi sahna chetidan kamida shuncha piksel ichkarida turadi (44 px bosiladigan maydon kesilmasligi uchun) */
export const MARKER_EDGE_PX = 24
/** Video o'lchami noma'lum bo'lsa (vertikal 9:16) */
export const DEFAULT_ASPECT = 9 / 16

const valid = (size: Size) => Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0

/** Video nisbati (eni / bo'yi); o'lcham noma'lum bo'lsa standart. */
export function aspectOf(video: Size): number {
  return valid(video) ? video.width / video.height : DEFAULT_ASPECT
}

/** Video kadrining sahnadagi to'rtburchagi. Sahna o'lchami yo'q (hali o'lchanmagan) -> nol to'rtburchak. */
export function fitFrame(stage: Size, video: Size, mode: FitMode): Rect {
  if (!valid(stage)) return { left: 0, top: 0, width: 0, height: 0 }
  const aspect = aspectOf(video)
  const stageAspect = stage.width / stage.height
  // contain: butun video ko'rinadi; cover: sahna to'ladi, ortig'i qirqiladi
  const fitWidth = mode === 'contain' ? stageAspect < aspect : stageAspect > aspect
  const width = fitWidth ? stage.width : stage.height * aspect
  const height = fitWidth ? stage.width / aspect : stage.height
  return { left: (stage.width - width) / 2, top: (stage.height - height) / 2, width, height }
}

/** `cover` bo'lganda video kadrining necha qismi (0..1) qirqiladi. */
export function cropFraction(stage: Size, video: Size): number {
  if (!valid(stage)) return 0
  const cover = fitFrame(stage, video, 'cover')
  if (cover.width <= 0 || cover.height <= 0) return 0
  return 1 - (Math.min(stage.width, cover.width) * Math.min(stage.height, cover.height)) / (cover.width * cover.height)
}

/** `cover` da videoning ko'rinadigan oynasi (0..1 koordinatalarda). */
export function visibleWindow(stage: Size, video: Size): { x0: number; x1: number; y0: number; y1: number } {
  const cover = fitFrame(stage, video, 'cover')
  if (cover.width <= 0 || cover.height <= 0) return { x0: 0, x1: 1, y0: 0, y1: 1 }
  const x0 = Math.max(0, -cover.left / cover.width)
  const y0 = Math.max(0, -cover.top / cover.height)
  return { x0, x1: 1 - x0, y0, y1: 1 - y0 }
}

/**
 * Sahna to'ldirilsinmi (`cover`) yoki butun video ko'rinsinmi (`contain`). Standart — `contain` (hech narsa kesilmaydi).
 * `cover` faqat ikki shart bilan: qirqim kichik (<= COVER_MAX_CROP) VA barcha belgilar ko'rinadigan oynaning ichida.
 */
export function chooseFit(stage: Size, video: Size, spots: ReadonlyArray<{ x: number; y: number }> = []): FitMode {
  if (!valid(stage) || !valid(video)) return 'contain'
  if (cropFraction(stage, video) > COVER_MAX_CROP) return 'contain'
  const win = visibleWindow(stage, video)
  const m = COVER_HOTSPOT_MARGIN
  const inside = spots.every((s) => s.x >= win.x0 + m && s.x <= win.x1 - m && s.y >= win.y0 + m && s.y <= win.y1 - m)
  return inside ? 'cover' : 'contain'
}

/** Belgi markazining sahnadagi joyi (px): kadr bo'yicha (x, y) -> sahna; chetga yaqin bo'lsa `edge` px ichkariga suriladi. */
export function placeHotspot(frame: Rect, stage: Size, x: number, y: number, edge = MARKER_EDGE_PX): { left: number; top: number } {
  const fx = Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0.5))
  const fy = Math.min(1, Math.max(0, Number.isFinite(y) ? y : 0.5))
  const rawLeft = frame.left + fx * frame.width
  const rawTop = frame.top + fy * frame.height
  // Sahna juda tor bo'lsa (2 * edge dan kichik) markaz o'rtada turadi
  const clampAxis = (value: number, size: number) => (size <= edge * 2 ? size / 2 : Math.min(size - edge, Math.max(edge, value)))
  return { left: clampAxis(rawLeft, stage.width), top: clampAxis(rawTop, stage.height) }
}
