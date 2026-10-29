# Resto-Admin (/ra/) — haqiqiy brauzer E2E (Playwright)

Haqiqiy Chromium, haqiqiy Django serveri va haqiqiy login formasi. Soxta "muvaffaqiyatli" chiqarish yo'q.

## Yurgizish

```bash
cd e2e
npm ci
npx playwright install chromium     # faqat birinchi marta (Playwright 1.63.0 -> Chromium 1243)
npx playwright test
```

Ildizdan bitta buyruq: `node scripts/e2e_resto_admin.mjs` (qo'shimcha argumentlar `playwright test` ga o'tadi, masalan `-g menyu`, `--headed`).

Talab: `backend/venv` (yoki `E2E_PYTHON=python3` va `pip install -r backend/requirements.txt`), Node 24.

Server o'zi ko'tariladi (`scripts/start-server.mjs`): vaqtinchalik SQLite (`e2e/.tmp/`) -> `migrate` -> `seed_e2e` -> `runserver` (127.0.0.1:8013).
Haqiqiy `backend/db.sqlite3`, `.env`, Telegram/AI/Sentry/Redis ishlatilmaydi; tashqi domenlarga so'rov brauzerda ham bloklanadi (bo'sh javob).

## Test foydalanuvchilari (`seed_e2e`)

| Rol | Login | Parol |
|---|---|---|
| Ega | `e2e_owner` | `E2E-parol-123!` |
| Menejer | `e2e_manager` | `E2E-parol-123!` |
| Ofitsiant | `e2e_waiter` | `E2E-parol-123!` |
| Oshpaz | `e2e_kitchen` | `E2E-parol-123!` |

Parolni almashtirish: `E2E_PASSWORD=... npx playwright test` (server ham, testlar ham shu qiymatni oladi).

## Stsenariylar

| Fayl | Nimani tekshiradi |
|---|---|
| `admin-tour.spec.ts` (a) | Ega `/ra/` ning 7 sahifasini ochadi: sarlavha, `console.error`/5xx/4xx yo'q, hujjat qayta yuklanmaydi (bitta navigatsiya so'rovi), har sahifada faqat o'z JS bo'lagi yuklanadi |
| `admin-tour.spec.ts` (e) | `/ra/` sahifalari 127.0.0.1/localhost dan boshqa domenga so'rov yubormaydi |
| `rbac.spec.ts` (b) | Ofitsiant dashboard'da "Bugungi tushum"ni ko'rmaydi, API javobida `today_revenue` yo'q |
| `rbac.spec.ts` (c) | Menejer egani tushira/bloklay olmaydi, parolini tiklay olmaydi (403); ega parol va roli o'zgarmaydi |
| `menu.spec.ts` (d) | Ega UI orqali yangi taom qo'shadi, ro'yxatda ko'rinadi, nomi bo'yicha qidiruvda topiladi |
| `finance.spec.ts` (f) | Ega to'lovni qaytaradi -> moliya xulosasi va dashboard tushumi shu summaga kamayadi |
| `auth.spec.ts` | Sessiyasiz `/ra/` loginga yo'naltiradi; noto'g'ri parol rad etiladi |

`auth.spec.ts` dagi "login sahifasi tashqi domenga so'rov yubormaydi" testi `test.fail` bilan belgilangan: `restaurant_admin/login.html`
hozir Google Fonts so'raydi. Shablon tuzatilgach test "kutilgan xato, lekin o'tdi" deb yiqiladi — `test.fail` qatorini olib tashlang.

## Yiqilganda

Skrinshot, trace va HTML hisobot `e2e/artifacts/` da (git'da emas):

```bash
npx playwright show-report artifacts/report
npx playwright show-trace artifacts/test-results/<test-papkasi>/trace.zip
```

## Sozlamalar

`E2E_PORT` (8013), `E2E_PYTHON`, `E2E_WORKDIR`, `E2E_REUSE_SERVER=1` (ishlayotgan serverga ulanish; baza `manage.py seed_e2e` bilan to'ldirilgan bo'lishi shart).
Testlar ketma-ket (1 worker) ishlaydi: bitta SQLite baza va holatni o'zgartiruvchi stsenariylar (taom qo'shish, to'lovni qaytarish).
