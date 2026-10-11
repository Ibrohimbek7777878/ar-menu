# Repository Structure

**Maqsad:** loyihadagi aktiv kod, legacy nusxalar, hujjatlar va generated artefaktlarni aralashtirmaslik.

## Kanonik Tuzilma

```text
online store_guliston/
├── backend/                         # Aktiv Django backend va server-rendered sahifalar
│   ├── manage.py                    # Django CLI entrypoint
│   ├── backend/                     # Django project package: settings, urls, ASGI/WSGI
│   ├── accounts/                    # Auth/account moduli
│   ├── api/                         # DRF API facade
│   ├── ar3d/                        # 3D/AR va 3D print biznes logikasi
│   ├── categories/                  # Katalog kategoriyalari
│   ├── couriers/                    # Kuryerlar
│   ├── finance/                     # Moliya va kassa logikasi
│   ├── maps/                        # Xarita endpointlari
│   ├── notifications/               # Telegram va bildirishnomalar
│   ├── orders/                      # Buyurtmalar, holat, inventar va audit
│   ├── payments/                    # Click/Payme/Cash providerlari
│   ├── products/                    # Tovar/taomlar
│   ├── shops/                       # Do'kon/restoran profillari va template'lar
│   ├── tables_restaurant/           # Stol, zal, reservation
│   ├── web/                         # Django web/TMA/seller views va URLlar
│   ├── templates/                   # Aktiv Django template'lar
│   ├── static/                      # Aktiv static fayllar
│   └── scripts/                     # Backend maintenance va regression scripts
├── frontend/                        # Aktiv React 19 + TypeScript restoran SPA
│   ├── src/
│   │   ├── components/ui/           # Qayta ishlatiladigan UI komponentlar
│   │   ├── context/                 # Offline-first navigation/order/table state
│   │   ├── core/                    # Role/auth/guard qatlamlari
│   │   ├── data/                    # Mock/default menu data
│   │   ├── pages/                   # SPA sahifalar
│   │   ├── router/                  # Route config
│   │   ├── services/                # API clientlar
│   │   ├── types/                   # TS domain typelar
│   │   └── utils/                   # Qidiruv va format helperlar
│   └── dist/                        # Generated build; gitga kiritilmaydi
├── MARKETPLACE/
│   ├── store_guliston_v1/           # Flutter marketplace ilovasi
│   └── frontend/                    # Legacy/static marketplace HTML prototiplari
├── 3D_AR_MENU/
│   ├── AR_MENU_LOYIHA/              # Alohida restoran/AR Django prototipi
│   └── air-3d-menu/                 # Alohida Vite prototipi
├── STUDIO_3D/                       # 3D studio prototip va statik sahifalari
├── docs/                            # Kanonik hujjatlar markazi
│   ├── 00_ARCHITECTURE_MASTER/      # Umumiy arxitektura, qoida, repo xaritasi
│   ├── 01_PRODUCT_RESTAURANT_3D_AR/
│   ├── 02_PRODUCT_MARKETPLACE_ONLINE_STORE/
│   ├── 03_PRODUCT_3D_STUDIO_PRINTING/
│   └── 04_SHARED_MODULES_AND_ARCHIVE/
│       └── legacy_root/             # Eski root/00_UMUMIY materiallari
├── roadmap/                         # Eski faza rejalari va topshiriq hujjatlari
├── scripts/                         # Repo darajasidagi tekshiruv/deploy helperlar
├── static/                          # Legacy/static exported assetlar
└── README.md                        # Kirish nuqtasi
```

## Ishlash Qoidalari

1. **Aktiv backend settings:** kanonik fayl `backend/backend/settings.py`. `backend/settings.py` faqat repo rootdan ishlaydigan external toollar uchun compatibility shim; u yerga real sozlama yozilmaydi.
2. **Aktiv restoran SPA:** `frontend/src/`. Frontend o'zgarishidan keyin `frontend` ichida `npm run build` bajariladi.
3. **Aktiv Django template'lar:** `backend/templates/`. Bu yer runtime template path bo'lgani uchun fayllarni mahsulot bo'yicha ko'chirishdan oldin view va template nomlari tekshiriladi.
4. **Marketplace mobil ilova:** `MARKETPLACE/store_guliston_v1/`. Flutter build/cache fayllari gitga kiritilmaydi.
5. **Legacy/prototiplar:** `MARKETPLACE/frontend/`, `3D_AR_MENU/AR_MENU_LOYIHA/`, `3D_AR_MENU/air-3d-menu/`, `STUDIO_3D/` runtimega aralashmasdan alohida turadi.
6. **Kanonik hujjatlar:** yangi arxitektura va topshiriq hujjatlari `docs/` ichiga yoziladi. Rootga yangi `.md` fayl qo'shilmaydi, faqat `README.md` va operatsion scriptlar bundan mustasno.
7. **Generated artefaktlar:** `node_modules`, `dist`, `build`, `.dart_tool`, `venv`, `__pycache__`, `staticfiles`, `media`, `logs` gitga kiritilmaydi.

## Arxiv Qayerda?

| Eski joy | Yangi joy | Izoh |
|---|---|---|
| Rootdagi `HANDOFF.md`, dizayn va TZ hujjatlari | `docs/04_SHARED_MODULES_AND_ARCHIVE/` va tegishli product archive | Root papka faqat entrypoint va scriptlar uchun qoldirildi |
| `00_UMUMIY/` | `docs/04_SHARED_MODULES_AND_ARCHIVE/legacy_root/00_UMUMIY/` | Eski umumiy hujjatlar, rasm va HTML konseptlar |
| `MARKETPLACE/TZ_*.md`, eski root yaml | `docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/ARCHIVE_SPECS/legacy_marketplace_root/` | Marketplace kod papkasidan reja hujjatlari ajratildi |
| `3D_AR_MENU/TZ_*.md`, `AR-TZ.md`, `DIZAYN_TZ.md` | `docs/01_PRODUCT_RESTAURANT_3D_AR/ARCHIVE_SPECS/legacy_3d_ar_menu_root/` | 3D/AR prototip papkasidan tarixiy TZlar ajratildi |

## Eng Muhim Entry Pointlar

| Qism | Fayl/jild | Vazifa |
|---|---|---|
| Django CLI | `backend/manage.py` | `DJANGO_SETTINGS_MODULE=backend.settings` bilan backendni boshqaradi |
| Django settings | `backend/backend/settings.py` | Installed apps, DB, static/media, security |
| Root settings shim | `backend/settings.py` | Repo rootdan `backend.settings` import qiladigan toollar uchun forwarder |
| Root urls | `backend/backend/urls.py` | Product URLlarni birlashtiradi |
| Product urls | `backend/backend/urls_restaurant.py`, `urls_market.py`, `urls_studio.py` | Mahsulotlar bo'yicha marshrutlar |
| Seller web | `backend/web/seller_views.py`, `backend/web/seller_urls.py` | Mini ERP sahifalar |
| Customer/TMA web | `backend/web/views.py`, `backend/web/tma_views.py` | Marketplace va restoran mijoz oqimi |
| React SPA | `frontend/src/App.tsx` | SPA router va global sahifa tanlash |
| React state | `frontend/src/context/NavigationContext.tsx` | Stol, buyurtma, savat, moliya state |
| Flutter app | `MARKETPLACE/store_guliston_v1/lib/main.dart` | Marketplace mobil ilova entrypoint |

## Tozalashda Tegilmaydigan Joylar

- `backend/templates/` fayllari nomini ommaviy o'zgartirmang: Django viewlarda string template pathlar bor.
- `backend/static/` ichidagi bundled assetlarni tekshirmasdan o'chirmang: ayrim template'lar ularga tayanadi.
- `MARKETPLACE/store_guliston_v1/ios`, `android`, `web`, `windows` platform papkalarini Flutter configsiz ko'chirmang.
- `3D_AR_MENU/AR_MENU_LOYIHA/` ichidagi alohida Django prototipi mustaqil loyiha sifatida qoladi.

## Tez Tekshiruv

```bash
cd backend
python manage.py check

cd ../frontend
npm run build

cd ../MARKETPLACE/store_guliston_v1
flutter test
```
