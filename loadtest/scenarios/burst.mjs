// C-stsenariy (TZ Q2): portlash. N ta mehmon `windowSec` soniya ichida (to'y, aksiya, hamma QR skanerlaydi) menyuni bir martadan ochadi.
// O'lchanadi: javob vaqtlari va "bo'shash vaqti" (oxirgi javob oyna tugagandan keyin necha soniyada keldi).
export const defaults = { users: 1000, windowSec: 10, menuPath: '/menu/', assets: [] };

export async function run(ctx, params) {
  const p = { ...defaults, ...params };
  const startedAt = ctx.recorder.now();
  let lastDoneAt = startedAt;
  const guest = async () => {
    await ctx.sleep(ctx.rng() * p.windowSec);
    if (ctx.stopped) return;
    const user = ctx.client.newUser();
    await ctx.client.request('menu', 'GET', p.menuPath, { user });
    if (p.assets.length) await Promise.all(p.assets.map((a) => ctx.client.request('asset', 'GET', a, { user })));
    lastDoneAt = Math.max(lastDoneAt, ctx.recorder.now());
  };
  await Promise.all(Array.from({ length: p.users }, guest));
  const windowEnd = startedAt + p.windowSec * 1000 * ctx.timeScale;
  ctx.shared.drainSec = Math.max(0, (lastDoneAt - windowEnd) / 1000);
  ctx.shared.notes.push(`Portlash: ${p.users} mehmon ${p.windowSec} s ichida; oxirgi javob oyna tugagach ${ctx.shared.drainSec.toFixed(1)} s dan keyin keldi`);
  return { users: p.users, drainSec: ctx.shared.drainSec };
}
