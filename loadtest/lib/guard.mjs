// Himoya (TZ §9.6): yuk testi faqat o'zimizning lokal/ichki muhitga. Boshqa odamning serveriga yoki production'ga
// tasodifan yuk berib yubormaslik uchun begona manzil faqat ikki aniq tasdiq bilan ochiladi.
import net from 'node:net';

function isPrivateHost(host) {
  if (host === 'localhost' || host === '::1' || host === '[::1]') return true;
  if (!net.isIPv4(host)) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function assertSafeTarget(base, { env = process.env, confirmTarget = '' } = {}) {
  const url = new URL(base);
  if (isPrivateHost(url.hostname)) return { remote: false, host: url.hostname };
  if (env.LT_ALLOW_REMOTE === '1' && confirmTarget === url.hostname) return { remote: true, host: url.hostname };
  throw new Error(
    `Xavfsizlik: "${url.hostname}" lokal/ichki manzil emas, yuk testi to'xtatildi. ` +
      `Faqat o'zingizning staging serveringizga ruxsat bor: LT_ALLOW_REMOTE=1 va --confirm-target ${url.hostname} bering. ` +
      `Production'ga yuk testi faqat egasining aniq ruxsati bilan va tunda.`,
  );
}
