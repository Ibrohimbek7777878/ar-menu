// tests/load/menu.js — k6 yuklama testi (menyu o'qish)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const cacheHit = new Rate('kesh_hit');
const menuTime = new Trend('menyu_vaqti');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 150 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:menu}': ['p(95)<200', 'p(99)<400'],
    'http_req_failed': ['rate<0.005'],
  },
};

export default function () {
  const base = __ENV.BASE || 'http://127.0.0.1:8060';
  const slug = __ENV.SLUG || 'test-rest';
  const lang = ['uz', 'ru', 'en'][Math.floor(Math.random() * 3)];

  const res = http.get(`${base}/v1/menu/${slug}/?lang=${lang}`, {
    tags: { name: 'menu' },
  });

  check(res, {
    'menyu 200': r => r.status === 200,
    'javobda categories yoki dishes bor': r => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.categories) || Array.isArray(data.dishes);
      } catch (e) {
        return false;
      }
    },
    'p95 < 200ms': r => r.timings.duration < 200,
  });

  cacheHit.add(res.headers['X-Cache'] === 'HIT');
  menuTime.add(res.timings.duration);

  sleep(Math.random() * 2 + 1);
}
