/**
 * Logotip/favicon ni YUKLASHDAN OLDIN brauzerda kichraytiradi (canvas): uzun tomon 512 px (favicon 256 px), shaffoflik saqlanadi
 * (PNG), surat JPEG qoladi. Kichraytirish EXIF (joylashuv va h.k.) ni ham olib tashlaydi.
 * Faqat brauzerda ishlaydi; sof qoidalar `logoFile.ts` da (sinalgan). Ochib bo'lmasa (HEIC'ni bilmaydigan brauzer) `ImageDecodeError`.
 */
import { ImageDecodeError, fitWithin } from '../Menu/BulkImport/imageResize';
import { MAX_SIDE, outputFileName, outputFormat } from './logoFile';
import type { ImageKind } from './types';

export { ImageDecodeError };

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    // EXIF yo'nalishini hisobga olamiz; eski brauzer parametrni rad etsa, parametrsiz urinamiz
    for (const options of [{ imageOrientation: 'from-image' } as ImageBitmapOptions, undefined]) {
      try {
        const bitmap = await createImageBitmap(file, options);
        return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
      } catch {
        // keyingi usul
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ImageDecodeError());
      image.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function resizeBrandImage(file: File, kind: ImageKind): Promise<File> {
  const decoded = await decode(file);
  try {
    const size = fitWithin(decoded.width, decoded.height, MAX_SIDE[kind]);
    const format = outputFormat(file);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new ImageDecodeError();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format.mime, format.quality));
    // iOS Safari canvas xotirasini darrov bo'shatsin
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new ImageDecodeError();
    return new File([blob], outputFileName(file.name, format, kind), { type: format.mime, lastModified: Date.now() });
  } finally {
    decoded.release();
  }
}
