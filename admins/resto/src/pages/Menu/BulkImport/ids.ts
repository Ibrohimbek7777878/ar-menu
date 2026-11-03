/**
 * Qayta yuborishdan himoya uchun yagona kalit (UUID v4).
 * `crypto.randomUUID` faqat xavfsiz ulanishda (https/localhost) bor; http orqali ochilgan sinov panelida yo'q bo'lishi mumkin,
 * shuning uchun `getRandomValues` va oxirgi chora sifatida `Math.random` bilan to'ldiriladi.
 */

export interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array<ArrayBuffer>) => unknown;
}

const HEX = '0123456789abcdef';

function bytesToUuid(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let out = '';
  for (let i = 0; i < 16; i += 1) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
    if (i === 3 || i === 5 || i === 7 || i === 9) out += '-';
  }
  return out;
}

export function makeUuid(cryptoLike: CryptoLike | undefined = globalThis.crypto): string {
  if (cryptoLike && typeof cryptoLike.randomUUID === 'function') return cryptoLike.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoLike && typeof cryptoLike.getRandomValues === 'function') {
    cryptoLike.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToUuid(bytes);
}
