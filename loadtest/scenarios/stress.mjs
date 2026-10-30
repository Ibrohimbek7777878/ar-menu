// B-stsenariy (TZ 1.2): STRESS. `users` ta ulanish o'ylash vaqtisiz, uzluksiz uradi (eng og'ir holat). Real xulq EMAS:
// faqat chegarani topish va "oldin/keyin" (S1, S3) taqqoslash uchun. Natija "1000 foydalanuvchi" isboti sifatida ishlatilmaydi.
export const defaults = { users: 100, paths: ['/menu/'], conditional: false };

export async function run(ctx, params) {
  const p = { ...defaults, ...params };
  await Promise.all(
    Array.from({ length: p.users }, async (_, i) => {
      const user = ctx.client.newUser();
      const pathName = p.paths[i % p.paths.length];
      let etag = '';
      while (!ctx.stopped) {
        const headers = p.conditional && etag ? { 'if-none-match': etag } : {};
        const r = await ctx.client.request(pathName, 'GET', pathName, { user, headers });
        if (r.headers.etag) etag = r.headers.etag;
      }
    }),
  );
  return { users: p.users };
}
