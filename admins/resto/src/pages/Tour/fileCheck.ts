/**
 * Video fayl yuklashdan OLDINGI tekshiruv. SOF mantiq: hech narsa import qilmaydi.
 * Chegaralar serverniki bilan bir xil (300 MB, 300 s, mp4/quicktime/webm); server baribir qayta tekshiradi (ffprobe),
 * bu yerda maqsad — foydalanuvchi 300 MB ni behuda yuklab, keyin rad etilmasligi.
 */

export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 300;
export const ALLOWED_VIDEO_TYPES: readonly string[] = ['video/mp4', 'video/quicktime', 'video/webm'];

export type VideoProblem = 'empty' | 'too_big' | 'bad_type' | 'too_long';

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

const EXTENSION_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * Fayl turi: brauzer bergan tur ruxsat etilganlardan bo'lsa shu; bo'sh yoki umumiy (`application/octet-stream`, ba'zi Android
 * tanlagichlari) bo'lsa — kengaytmadan; boshqa tur — o'zi (keyin rad etiladi).
 */
export function detectVideoType(file: Pick<FileLike, 'name' | 'type'>): string {
  const declared = String(file.type ?? '').trim().toLowerCase();
  if (ALLOWED_VIDEO_TYPES.includes(declared)) return declared;
  if (declared === '' || declared === 'application/octet-stream') {
    const match = /\.([A-Za-z0-9]+)$/.exec(String(file.name ?? ''));
    return match ? (EXTENSION_TYPES[match[1].toLowerCase()] ?? '') : '';
  }
  return declared;
}

/** Hajm va tur bo'yicha tekshiruv (davomiylik — `checkVideoDuration`, brauzer metama'lumotidan keyin) */
export function checkVideoFile(file: FileLike | null | undefined): VideoProblem | null {
  if (!file || !(file.size > 0)) return 'empty';
  if (!ALLOWED_VIDEO_TYPES.includes(detectVideoType(file))) return 'bad_type';
  if (file.size > MAX_VIDEO_BYTES) return 'too_big';
  return null;
}

/**
 * Davomiylik (soniya). Brauzer o'qiy olmasa (noma'lum kodek, NaN, Infinity, 0) — null: yuklashga ruxsat, server tekshiradi.
 * Aniq 300 s ruxsat etiladi, undan oshsa 'too_long'.
 */
export function checkVideoDuration(seconds: number | null | undefined): VideoProblem | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds > MAX_VIDEO_SECONDS ? 'too_long' : null;
}

/** Hajm matni: 1536 -> "1.5 KB", 5 MB -> "5.0 MB" (o'nlik kasr nuqta bilan, tilga bog'liq emas) */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Yuklash foizi, butun, 0..100 */
export function progressPercent(loaded: number, total: number): number {
  if (!(total > 0) || !Number.isFinite(loaded) || loaded <= 0) return 0;
  return Math.min(100, Math.floor((loaded / total) * 100));
}
