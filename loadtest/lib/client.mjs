// HTTP mijoz: keep-alive, har virtual foydalanuvchiga alohida cookie, har so'rovning vaqti Recorder'ga yoziladi.
// Brauzer xulqi: ishlatilgan (reused) keep-alive ulanish javob boshlanmasdan uzilsa, IDEMPOTENT GET bir marta
// o'zi qayta uriladi (bu "retried" deb alohida sanaladi). POST hech qachon avtomatik qayta yuborilmaydi.
import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';

export class Recorder {
  constructor() {
    this.t0 = performance.now();
    this.samples = []; // { step, t (ms, boshlanish), ms, status, err, bytes, retried }
    this.retried = 0;
  }
  now() {
    return performance.now() - this.t0;
  }
  add(sample) {
    this.samples.push(sample);
  }
}

function classify(e) {
  if (!e) return 'noma\'lum';
  if (e.message === 'timeout') return 'timeout';
  return e.code || e.message || 'xato';
}

function storeCookies(user, setCookie) {
  if (!user || !setCookie) return;
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attrs.some((a) => /^\s*max-age\s*=\s*0\s*$/i.test(a)) || value === '';
    if (expired) user.cookies.delete(name);
    else user.cookies.set(name, value);
  }
}

export class Client {
  constructor({ base, recorder, maxSockets = 4096, timeoutMs = 15000 }) {
    this.url = new URL(base);
    this.mod = this.url.protocol === 'https:' ? https : http;
    this.agent = new this.mod.Agent({ keepAlive: true, maxSockets, maxFreeSockets: Math.min(maxSockets, 1024) });
    this.rec = recorder;
    this.timeoutMs = timeoutMs;
  }

  close() {
    this.agent.destroy();
  }

  newUser() {
    return { cookies: new Map() };
  }

  _attempt(method, path, { user, headers, body, wantBody }) {
    return new Promise((resolve) => {
      const h = { 'accept-encoding': 'identity', 'user-agent': 'guliston-loadtest/0.1', ...headers };
      if (user && user.cookies.size) h.cookie = [...user.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
      if (body !== undefined) h['content-length'] = Buffer.byteLength(body);
      let done = false;
      let gotResponse = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r);
      };
      const req = this.mod.request(
        { agent: this.agent, method, hostname: this.url.hostname, port: this.url.port || undefined, path, headers: h },
        (res) => {
          gotResponse = true;
          const chunks = [];
          let bytes = 0;
          res.on('data', (c) => {
            bytes += c.length;
            if (wantBody) chunks.push(c);
          });
          res.on('end', () => {
            storeCookies(user, res.headers['set-cookie']);
            finish({ status: res.statusCode, headers: res.headers, bytes, body: wantBody ? Buffer.concat(chunks).toString('utf8') : '' });
          });
          res.on('error', (e) => finish({ err: classify(e), gotResponse: true }));
          res.on('aborted', () => finish({ err: 'aborted', gotResponse: true }));
        },
      );
      const timer = setTimeout(() => {
        req.destroy(new Error('timeout'));
      }, this.timeoutMs);
      req.on('error', (e) => finish({ err: classify(e), gotResponse, reused: Boolean(req.reusedSocket) }));
      if (body !== undefined) req.write(body);
      req.end();
    });
  }

  /**
   * So'rov yuboradi va natijani Recorder'ga yozadi.
   * Qaytaradi: { status, headers, body, ms, err }.
   */
  async request(step, method, path, { user, headers = {}, body, wantBody = false } = {}) {
    const startedAt = this.rec.now();
    let r = await this._attempt(method, path, { user, headers, body, wantBody });
    let retried = false;
    if (r.err && method === 'GET' && r.reused && !r.gotResponse && (r.err === 'ECONNRESET' || r.err === 'EPIPE')) {
      retried = true;
      this.rec.retried++;
      r = await this._attempt(method, path, { user, headers, body, wantBody });
    }
    const ms = this.rec.now() - startedAt;
    this.rec.add({ step, t: startedAt, ms, status: r.status ?? 0, err: r.err ?? null, bytes: r.bytes ?? 0, retried });
    return { status: r.status ?? 0, headers: r.headers ?? {}, body: r.body ?? '', ms, err: r.err ?? null };
  }
}
