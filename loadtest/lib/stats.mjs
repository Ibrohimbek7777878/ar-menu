// Statistika yordamchilari. Persentil: "eng yaqin tartib raqami" usuli (nearest-rank), tashqi paketsiz.

export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return NaN;
  const rank = Math.ceil(p * sortedAsc.length);
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.max(0, rank - 1))];
}

export function summarize(values) {
  const a = Float64Array.from(values).sort();
  const n = a.length;
  if (!n) return { count: 0, mean: NaN, p50: NaN, p95: NaN, p99: NaN, max: NaN };
  let sum = 0;
  for (const v of a) sum += v;
  return {
    count: n,
    mean: sum / n,
    p50: percentile(a, 0.5),
    p95: percentile(a, 0.95),
    p99: percentile(a, 0.99),
    max: a[n - 1],
  };
}

/** Namunalarni `windowMs` li oynalarga bo'lib, har oynada soni, p95 va xatolar sonini qaytaradi (degradatsiyani ko'rish uchun). */
export function windows(samples, windowMs) {
  const map = new Map();
  for (const s of samples) {
    const k = Math.floor(s.t / windowMs);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return [...map.keys()].sort((a, b) => a - b).map((k) => {
    const list = map.get(k);
    const ok = list.filter((s) => !s.err && s.status < 500).map((s) => s.ms);
    const sm = summarize(ok);
    return {
      startSec: (k * windowMs) / 1000,
      count: list.length,
      rps: list.length / (windowMs / 1000),
      p95: sm.p95,
      errors: list.filter((s) => s.err || s.status >= 500).length,
    };
  });
}
