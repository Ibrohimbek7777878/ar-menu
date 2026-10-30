// Xodim ekranlari (TZ Q4): har ekran haqiqiy login formasi orqali kiradi va har `pollMs` da (standart 5 s) serverga so'raydi,
// xuddi NavigationContext.tsx dagi STAFF_POLL_MS kabi. KDS: buyurtmalar; ofitsiant: buyurtmalar + stollar + chaqiruvlar.
// Login ma'lumoti faqat muhit o'zgaruvchisidan (LT_STAFF_USER / LT_STAFF_PASS), kodga yozilmaydi.
export const defaults = { screens: 20, waiterShare: 0.5, pollMs: 5000, rampSec: 10, conditional: false, loginPath: '/admin/login/' };

const API = '/api/v1/restaurant';

function csrfFrom(html) {
  const m = html.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/) || html.match(/value=["']([^"']+)["']\s+name=["']csrfmiddlewaretoken["']/);
  return m ? m[1] : '';
}

async function login(ctx, user, p, username, password) {
  const page = await ctx.client.request('setup-login-page', 'GET', p.loginPath, { user, wantBody: true });
  const token = csrfFrom(page.body) || user.cookies.get('csrftoken') || '';
  const form = new URLSearchParams({ username, password, csrfmiddlewaretoken: token, next: '/ra/' }).toString();
  const r = await ctx.client.request('setup-login', 'POST', p.loginPath, {
    user,
    headers: { 'content-type': 'application/x-www-form-urlencoded', referer: `${ctx.client.url.origin}${p.loginPath}` },
    body: form,
  });
  return r.status === 302 && user.cookies.has('sessionid');
}

export async function run(ctx, params) {
  const p = { ...defaults, ...params };
  const username = process.env.LT_STAFF_USER;
  const password = process.env.LT_STAFF_PASS;
  if (!username || !password) throw new Error('Xodim stsenariysi uchun LT_STAFF_USER va LT_STAFF_PASS muhit o\'zgaruvchilari kerak');
  let loggedIn = 0;

  const screen = async (i) => {
    await ctx.sleep((i / p.screens) * p.rampSec);
    if (ctx.stopped) return;
    const user = ctx.client.newUser();
    if (!(await login(ctx, user, p, username, password))) {
      ctx.shared.notes.push(`Ekran ${i}: login muvaffaqiyatsiz`);
      return;
    }
    loggedIn++;
    const waiter = i / p.screens < p.waiterShare;
    const paths = waiter
      ? [['waiter-orders', `${API}/orders/`], ['waiter-tables', `${API}/tables/`], ['waiter-calls', `${API}/calls/`]]
      : [['kds-orders', `${API}/orders/`]];
    const etags = new Map();
    while (!ctx.stopped) {
      for (const [step, path] of paths) {
        const headers = p.conditional && etags.has(path) ? { 'if-none-match': etags.get(path) } : {};
        const r = await ctx.client.request(step, 'GET', path, { user, headers });
        if (r.headers.etag) etags.set(path, r.headers.etag);
      }
      await ctx.sleep(p.pollMs / 1000);
    }
  };
  await Promise.all(Array.from({ length: p.screens }, (_, i) => screen(i)));
  ctx.shared.notes.push(`Xodim ekranlari: ${loggedIn}/${p.screens} muvaffaqiyatli kirdi`);
  return { screens: p.screens, loggedIn };
}
