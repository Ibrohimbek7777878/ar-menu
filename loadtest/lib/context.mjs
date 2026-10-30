// Stsenariylar uchun umumiy kontekst: soat, to'xtash vaqti, "o'ylash vaqti" (timeScale bilan), tasodifiy son.
import { mulberry32 } from './rng.mjs';

export function createContext({ client, recorder, durationSec, timeScale = 1, seed = 42 }) {
  const rng = mulberry32(seed);
  const stopListeners = new Set();
  const ctx = {
    client,
    recorder,
    rng,
    timeScale,
    stopped: false,
    stopAtMs: recorder.now() + durationSec * 1000,
    shared: { orderNumbers: [], orderFailures: 0, notes: [] },
    /** [min, max] oralig'ida tasodifiy son */
    between(min, max) {
      return min + rng() * (max - min);
    },
    pick(list) {
      return list[Math.floor(rng() * list.length)];
    },
    /** `sec` soniya kutadi (timeScale ga ko'paytiriladi); to'xtatilsa darrov qaytadi */
    sleep(sec) {
      return new Promise((resolve) => {
        if (ctx.stopped) return resolve();
        const done = () => {
          clearTimeout(t);
          stopListeners.delete(done);
          resolve();
        };
        const t = setTimeout(done, Math.max(0, sec * 1000 * timeScale));
        stopListeners.add(done);
      });
    },
    stop() {
      ctx.stopped = true;
      for (const fn of [...stopListeners]) fn();
    },
  };
  return ctx;
}

/** Menyu JSON'idan taom id'larini toqat bilan terib oladi (JSON tuzilmasi o'zgarsa ham ishlaydi). */
export function collectProductIds(json) {
  const ids = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      const id = node.id ?? node.product_id;
      const looksLikeProduct = Number.isInteger(id) && ('price' in node || 'name' in node) && node.is_available !== false;
      if (looksLikeProduct) ids.add(id);
      Object.values(node).forEach(walk);
    }
  };
  walk(json);
  return [...ids];
}
