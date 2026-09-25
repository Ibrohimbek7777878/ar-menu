// tests/load/buyurtma.js — k6 yuklama testi (buyurtma yaratish va idempotency)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const dublikat = new Counter('dublikat_buyurtma');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:order}': ['p(95)<250', 'p(99)<500'],
    'http_req_failed{name:order}': ['rate<0.01'],
    'dublikat_buyurtma': ['count==0'],
  },
};

export default function () {
  const base = __ENV.BASE || 'http://127.0.0.1:8060';
  const idem = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    session_id: `gs_${__VU}_${__ITER}`,
    table_id: (__VU % 10) + 1,
    items: [
      { dish_id: 1, qty: 2, modifiers: [], note: '', ar_viewed: true },
    ],
    note: 'k6 yuklama testi',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idem,
    },
    tags: { name: 'order' },
  };

  const r1 = http.post(`${base}/v1/orders/`, payload, params);
  check(r1, {
    'buyurtma status 201 yoki 200': r => r.status === 201 || r.status === 200,
    'javobda id bor': r => {
      try { return JSON.parse(r.body).id > 0; } catch (e) { return false; }
    },
    'p95 < 250ms': r => r.timings.duration < 250,
  });

  // Idempotency: xuddi shu kalit bilan qayta chaqirish
  const r2 = http.post(`${base}/v1/orders/`, payload, params);
  if (r1.status === 201 && r2.status === 201) {
    try {
      const id1 = JSON.parse(r1.body).id;
      const id2 = JSON.parse(r2.body).id;
      if (id1 !== id2) {
        dublikat.add(1);
        console.error(`DUBLIKAT BUYURTMA! ${id1} != ${id2}`);
      }
    } catch (e) {}
  }

  sleep(1);
}
