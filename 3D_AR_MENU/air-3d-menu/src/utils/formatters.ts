import { Currency } from '../types';

export const USD_RATE = 12800; // 1 USD = 12,800 UZS
export const EUR_RATE = 13900; // 1 EUR = 13,900 UZS

export function formatPrice(priceInUzs: number, currency?: Currency | string): string {
  if (currency === 'USD') {
    const usd = (priceInUzs / USD_RATE).toFixed(2);
    return `$${usd}`;
  }
  if (currency === 'EUR') {
    const eur = (priceInUzs / EUR_RATE).toFixed(2);
    return `€${eur}`;
  }
  return `${priceInUzs.toLocaleString()} so'm`;
}

export function speakText(text: string, lang: 'uz' | 'ru' | 'en' = 'uz') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // stop previous speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  if (lang === 'ru') {
    utterance.lang = 'ru-RU';
  } else if (lang === 'en') {
    utterance.lang = 'en-US';
  } else {
    // Uzbek or fallback
    utterance.lang = 'uz-UZ';
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
