# Restoran 3D menyu — serverga joylashtirish (R9)

Bu papka productionni **bitta serverda, Docker Compose bilan** ishga tushiradi. Server, domen va VPS hali tanlanmagan
(egasi "keyin hal qilamiz" degan), shuning uchun hamma narsa lokal noutbukda sinalgan. Pastda **nima sinalgani va nima
sinalmagani** ochiq yozilgan.

## Tarkib

| Xizmat | Vazifasi |
|---|---|
| `db` | PostgreSQL 16 (ma'lumot `pgdata` hajmida) |
| `init` | Bir martalik: `media/logs/cache` hajmlari egasini `app` (uid 10001) ga to'g'rilaydi, so'ng chiqadi |
| `web` | Django + gunicorn (migratsiya va `collectstatic` ishga tushganda avtomatik) |
| `worker` | `run_workers`: Telegram bildirishnomalar (outbox) va 3D ishchi |
| `caddy` | HTTPS (Let's Encrypt avtomatik), gzip/zstd, statika va `/media/` ni to'g'ridan-to'g'ri beradi, qolganini `web` ga uzatadi |

Tashqariga faqat Caddy portlari (80/443) ochiladi. Baza va web ichki tarmoqda.

## Talablar

- Linux VPS (Ubuntu 22.04/24.04), **kamida 2 vCPU / 4 GB RAM / 40 GB disk** (3D modellar va zaxira uchun joy kerak).
- Docker Engine + `docker compose` plagini.
- Domen: A yozuvi server IP'ga qaratilgan bo'lishi shart (aks holda Let's Encrypt sertifikat bera olmaydi).
- 80 va 443 portlar ochiq.
- **Domenni oldindan tanlang.** QR kodlar shu domenda chop etiladi; keyin o'zgartirsangiz, chop etilgan QR'lar ishlamay qoladi.

## Birinchi ishga tushirish

```bash
git clone <repo> /srv/guliston && cd /srv/guliston
git checkout <release-branch>

cd deploy
cp .env.production.example .env
nano .env        # DOMAIN, POSTGRES_PASSWORD, DJANGO_SECRET_KEY, TELEGRAM_* ni to'ldiring
chmod 600 .env

./scripts/deploy.sh
```

`deploy.sh` rasmni quradi, ishga tushiradi, sog'lomlikni kutadi. Yangi versiya sog'lom bo'lmasa — **o'zi oldingisiga
qaytadi** va egasiga Telegram'da xabar yuboradi (`ALERT_TELEGRAM_CHAT_ID`).

Keyin birinchi restoranni oching:

```bash
docker compose exec web python manage.py create_restaurant \
    --name "Restoran nomi" --owner egasi_login --tables 12
```

Parol berilmasa, xavfsiz parol yaratilib **bir marta** ko'rsatiladi — uni darhol saqlang.

## Kundalik jarayonlar

| Nima | Buyruq |
|---|---|
| Yangi versiyani chiqarish | `git pull && ./scripts/deploy.sh` |
| Qo'lda orqaga qaytarish | `./scripts/rollback.sh` |
| Zaxira nusxa (baza + media) | `./scripts/backup.sh` |
| Bazani tiklash | `./scripts/restore.sh backups/db_daily_YYYYMMDD_HHMMSS.dump` |
| Zaxira haqiqatan tiklanishini tekshirish | `./scripts/verify_backup.sh` |
| Sog'lomlik tekshiruvi | `./scripts/healthcheck.sh` |
| Loglar | `docker compose logs -f web worker` |

### Avtomatik jadval (systemd)

`deploy/systemd/` ichida tayyor taymerlar bor: kunlik zaxira (03:30), haftalik zaxira tekshiruvi, har daqiqalik
sog'lomlik tekshiruvi. O'rnatish:

```bash
sudo cp deploy/systemd/guliston-{backup,verify-backup,healthcheck}.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now guliston-backup.timer guliston-verify-backup.timer guliston-healthcheck.timer
```

`guliston-web.service` va `guliston-workers.service` — Docker'siz o'rnatish uchun (kerak bo'lmasa o'rnatmang).

Zaxira siyosati: kunlik nusxalar 7 kun, yakshanba nusxalari 5 hafta, `pre-deploy` nusxalari 14 kun saqlanadi.
**Zaxirani serverning o'zida saqlash yetarli emas** — `deploy/backups/` papkasini boshqa joyga (boshqa server, S3/B2,
`rclone`) ko'chirib turing. Hozir bu avtomatlashtirilmagan.

## Sozlamalar eslatmasi

- `.env` hech qachon git'ga tushmaydi (`.gitignore`'da). `DEBUG=False`, `DEMO_MODE=False`, `ALLOW_MOCK_PAYMENTS=False`
  production'da doim shunday bo'lishi kerak. Zaif `SECRET_KEY` yoki `ALLOWED_HOSTS=*` bo'lsa Django ishga tushmaydi.
- Production SQLite bilan ishga tushmaydi (`ALLOW_SQLITE_IN_PRODUCTION` bilan majburlash mumkin, tavsiya etilmaydi).
- Eski SQLite bazadagi ma'lumotni (taom, 3D model) ko'chirish kerak bo'lsa:
  `PYTHON=backend/venv/bin/python ./scripts/migrate_sqlite_to_postgres.sh /yo'l/db.sqlite3`
  Test buyurtmalari, sessiyalar va outbox ko'chirilmaydi. Haqiqiy restoran odatda `create_restaurant` bilan toza ochiladi.

## Multi-tenant: bitta umumiy server, har mijoz `mijoz.<domen>`

Qisqa: `PLATFORM_DOMAIN` bo'sh bo'lsa (standart) hech narsa o'zgarmaydi — bitta restoran/bitta server rejimi. Berilsa, har mijoz
o'z subdomenida ochiladi, ma'lumotlari va xodimlari boshqa mijozlardan ajratiladi (kod: `backend/tenancy.py`, `shops/tenancy.py`).

**1. DNS.** Domen provayderida ikkita yozuv: `A  domen -> server IP` va wildcard `A  *.domen -> server IP`
(IPv6 bo'lsa `AAAA` ham). Yangi mijoz uchun DNS'ga tegish shart emas — wildcard hammasini qoplaydi.

**2. Wildcard TLS (Caddy).** Ikki yo'l:

- *Tavsiya: DNS-challenge.* Bitta `*.domen` + `domen` sertifikati. Caddy'ni DNS provayderingiz plagini bilan yig'ing
  (`xcaddy build --with github.com/caddy-dns/cloudflare` kabi) va `deploy/Caddyfile` da sayt manzili va `tls` bloki:
  ```
  {$DOMAIN}, *.{$DOMAIN} {
      tls {
          dns cloudflare {env.DNS_API_TOKEN}
      }
      # ...qolgan bloklar o'zgarishsiz
  ```
  Standart (bitta domenli) `Caddyfile` ATAYLAB o'zgartirilmagan: `PLATFORM_DOMAIN` o'rnatilmasa eski sozlama ishlayveradi.
- *On-demand TLS* (`tls { on_demand }`) FAQAT `ask` endpointi bilan xavfsiz: usiz istalgan odam tasodifiy subdomen so'rab
  sertifikat chiqarishni majbur qilib, Let's Encrypt limitini tugatishi mumkin. Bunday `ask` endpointi HALI yozilmagan
  (rejada) — shuning uchun on-demand'ni hozir yoqmang.

**3. Muhit.** `deploy/.env` ga (`env_file` konteynerga o'tkazadi): `PLATFORM_DOMAIN=domen` (faqat domen: sxema/port yo'q).
`settings.py` o'zi `ALLOWED_HOSTS` ga `.domen` va `CSRF_TRUSTED_ORIGINS` ga `https://*.domen` qo'shadi. Qo'shimcha:
`TENANT_RESERVED_SUBDOMAINS=vip,billing2` (mijozga berilmaydigan qo'shimcha nomlar), `USE_X_FORWARDED_HOST` — ODDIY holatda
`False` qoldiring (Caddy Host sarlavhasini o'zgartirmaydi). Cookie'lar host-only: `SESSION_COOKIE_DOMAIN` /
`CSRF_COOKIE_DOMAIN` ni HECH QACHON o'rnatmang (mijozlar sessiyasi aralashib ketadi).
`RESTAURANT_PUBLIC_URL` (compose'da `https://${DOMAIN}`) bu rejimda stol QR kodlarini umumiy domenga yo'naltiradi:
multi-tenant ishga tushirishdan oldin uni bo'shating (QR so'rov kelgan mijoz hostidan olinadi). Bot havolalari esa
mijozning o'z subdomeniga ketadi.

**4. Yangi mijoz qo'shish.**
```
docker compose exec web python manage.py create_restaurant \
    --name "Bahor Kafe" --owner bahor_ega --password '...' \
    --subdomain bahor --business-type cafe --tables 12 --no-default
```
`--subdomain` 3–40 belgi (kichik lotin harf, raqam, defis; band so'zlar: www, app, admin, api, static, media, platform, mail,
ra, seller, shop, test, demo ...), `--business-type` `restaurant|cafe|banquet`. Berilmasa subdomen `slug`dan olinadi.
Mijoz darhol `https://bahor.domen/` da ochiladi, xodimlar `https://bahor.domen/admin/login/` dan kiradi
(boshqa mijoz xodimi bu manzilga kira olmaydi). To'xtatish: do'konning `status` maydonini `suspended` qiling (admin panel) —
sayt "Bu restoran hozir faol emas" (503) ko'rsatadi, ma'lumot saqlanadi; `active` qaytaradi.

**5. Tekshirish.** `curl -sI https://bahor.domen/health/` (200), `https://yoq.domen/` (404 sahifa), apex `https://domen/` va
`www.` (platforma hosti). Eslatma: media fayllari (`/media/`) hozircha umumiy papkada (tenantga bo'linmagan), Telegram bot
bitta (token umumiy).

## Nima sinalgan, nima SINALMAGAN

**Lokal noutbukda to'liq sinalgan** (Docker, `DOMAIN=localhost`, 8080/8443 portlar):

- Toza o'rnatish: bo'sh hajmlardan `up` → migratsiya, health, HTTPS (Caddy ichki sertifikati).
- Buyurtma berish, worker orqali Telegram yuborish (soxta Telegram serveriga), outbox qayta urinishlari.
- `media` yuklash va Caddy orqali berish (`/media/` keshi, `nosniff`, path traversal 400).
- Zaxira → tiklash → `verify_backup` (alohida bazaga tiklab, qator sonlarini solishtiradi).
- `deploy.sh`: nosoz versiya chiqarilganda avtomatik orqaga qaytish va ogohlantirish.
- `healthcheck.sh`: ketma-ket ikkinchi xatoda ogohlantirish, tiklanganda xabar.
- SQLite → PostgreSQL ko'chirish: 2282 ob'ekt, jadval qatorlari to'liq mos keldi, ketma-ketliklar (sequence) to'g'ri.
- To'liq test to'plami SQLite, PostgreSQL 16 va toza virtualenv'da yashil.

**Sinalmagan (server paydo bo'lgach birinchi navbatda tekshiring):**

- Haqiqiy domen va Let's Encrypt sertifikati. Lokal sinovda faqat Caddy'ning ichki sertifikati ishlatilgan.
- Haqiqiy Telegram bot (lokal sinovda soxta server ishlatilgan; token va chat ID to'g'riligini egasi tekshiradi).
- **1000 ta bir vaqtdagi foydalanuvchi.** Bu noutbukda isbotlab bo'lmaydi. Asos tayyorlangan: gunicorn gthread
  (`WEB_CONCURRENCY` × `GUNICORN_THREADS`), PostgreSQL bilan doimiy ulanishlar (`CONN_MAX_AGE`), statika Caddy'dan
  uzoq keshlanadi, asosiy sahifalar uchun so'rovlar soni (query budget) testlari bor. Lekin haqiqiy yuk sinovi (R10)
  VPS'da o'tkazilmaguncha bu raqamga kafolat berilmaydi.
- Tashqi zaxira nusxa (yuqorida yozilgan) — hozircha qo'lda.
- Server qayta yuklanganda (reboot) stek o'zi tiklanishi: `restart: unless-stopped` qo'yilgan, Docker xizmati yoqilgan
  bo'lsa ishlashi kerak, lekin real serverda sinalmagan.

## Muammo bo'lsa

| Belgi | Tekshirish |
|---|---|
| Sayt ochilmaydi, sertifikat xatosi | `docker compose logs caddy` — odatda DNS hali yangilanmagan yoki 80/443 yopiq |
| 400 Bad Request | `DOMAIN` brauzerdagi manzilga aynan mos kelishi kerak (`ALLOWED_HOSTS` shundan olinadi) |
| 403 CSRF | `DOMAIN` va `HTTPS_PORT` ni tekshiring, `docker compose up -d` bilan qayta yarating |
| Telegram xabarlari kelmayapti | `docker compose logs worker`; `OutboxEvent` jadvalida `failed` holatlar; token/chat ID |
| Yuklash `Permission denied` | `docker compose up -d` — `init` xizmati egalikni to'g'rilaydi |
| Yangi versiya chiqmadi | `deploy.sh` o'zi orqaga qaytargan bo'ladi; sababi uchun `docker compose logs web` |
