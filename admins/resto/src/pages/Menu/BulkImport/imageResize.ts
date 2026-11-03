/**
 * Telefon surati juda katta bo'ladi (4-12 MB, 4000+ px). Yuklashdan OLDIN brauzerda 1600 px gacha kichraytirib,
 * JPEG (0.85) ga aylantiramiz: yuklash tez bo'ladi, server baribir qayta tekshiradi.
 *
 * `fitWithin`, `jpegFileName` — sof hisob (DOM'siz), `node --test` bilan tekshiriladi.
 * `downscaleImage` — DOM (canvas) qismi; faqat brauzerda chaqiriladi.
 */

export const MAX_IMAGE_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

export interface FittedSize {
  width: number;
  height: number;
  /** Kichraytirish kerak bo'ldimi (false = o'lcham o'zgarmagan). */
  scaled: boolean;
}

/** Uzun tomon `maxSide` dan oshmasin; nisbat saqlanadi; hech qachon kattalashtirilmaydi; kamida 1 px. */
export function fitWithin(width: number, height: number, maxSide: number = MAX_IMAGE_SIDE): FittedSize {
  const w = Math.round(width);
  const h = Math.round(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new RangeError('Rasm o\'lchami noto\'g\'ri');
  }
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { width: w, height: h, scaled: false };
  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
    scaled: true,
  };
}

/** "IMG_001.HEIC" -> "IMG_001.jpg"; nomi bo'lmasa "rasm.jpg". */
export function jpegFileName(name: string): string {
  const base = Array.from(String(name ?? '').replace(/\.[A-Za-z0-9]+$/, ''))
    .map((char) => (char.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(char) ? '_' : char))
    .join('')
    .trim()
    .slice(0, 80);
  return `${base || 'rasm'}.jpg`;
}

export class ImageDecodeError extends Error {
  constructor(message = 'Rasmni ochib bo\'lmadi') {
    super(message);
    this.name = 'ImageDecodeError';
  }
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    // EXIF yo'naltirishni hisobga olamiz (telefonda gorizontal tushgan, "yotiq" saqlangan rasmlar to'g'ri bo'lsin).
    // Eski brauzerlar bu parametrni rad etishi mumkin: shunda parametrsiz urinib ko'ramiz.
    const attempts: Array<ImageBitmapOptions | undefined> = [{ imageOrientation: 'from-image' }, undefined];
    for (const options of attempts) {
      try {
        const bitmap = await createImageBitmap(file, options);
        return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
      } catch {
        // keyingi usulga o'tamiz
      }
    }
  }
  // Oxirgi chora: <img>. Zamonaviy brauzerlar uni EXIF bo'yicha o'zi aylantiradi.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ImageDecodeError());
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Rasmni 1600 px gacha kichraytirib JPEG (0.85) qiladi. Shaffof fon oq bilan to'ldiriladi (JPEG shaffoflikni bilmaydi).
 * Ochib bo'lmasa (masalan, HEIC'ni qo'llamaydigan brauzer) `ImageDecodeError` tashlaydi.
 */
export async function downscaleImage(file: File): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const size = fitWithin(decoded.width, decoded.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new ImageDecodeError();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // iOS Safari canvas xotirasini darrov bo'shatish uchun
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new ImageDecodeError();
    return new File([blob], jpegFileName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    decoded.release();
  }
}
