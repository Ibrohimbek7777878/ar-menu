# Online Store Guliston — Ko'p Mahsulotli Raqamli Ekotizim

> **Oxirgi yangilanish:** 2026-10-01  
> **Arxitektura:** Bitta Django yadrosi (Shared Core Engine) ustida qurilgan **3 ta to'liq mustaqil mahsulot**.  
> **Hujjatlar markazi:** [`docs/`](docs/)

Ushbu repozitoriy dasturchilar va AI yordamchilari kod, hujjatlar yoki biznes mantig'ini bir-biriga aralashtirib yubormasligi uchun **3 ta mustaqil mahsulotga** qat'iy ajratilgan. Har bir mahsulot o'zining web-ilovasi, mini ERP boshqaruv paneli, Telegram boti va hujjatlar paketiga ega.

---

## 🧭 Tezkor Mahsulotlar Xaritasi

| Mahsulot | Asosiy Web Yo'li | Mini ERP Boshqaruv | Telegram Bot | Asosiy Hujjat |
|---|---|---|---|---|
| **#1 Restoran 3D/AR & NFC Menyu** | `/` yoki `/restaurant/` | `/seller/tables/`, `/seller/kds/`, `/seller/waiter/` | `@marketing_orign_bot` (`/bot/restaurant/webhook/`) | [`docs/01_PRODUCT_RESTAURANT_3D_AR/`](docs/01_PRODUCT_RESTAURANT_3D_AR/) |
| **#2 Online Store Guliston (Marketplace)** | `/market/` | `/seller/products/`, `/seller/orders/`, `/seller/couriers/` | `TELEGRAM_MARKET_BOT_TOKEN` (`/bot/market/webhook/`) | [`docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/`](docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/) |
| **#3 3D Studio & Buyurtma Chop Etish** | `/studio/` yoki `/3d-print/` | `/seller/studio/` (Print Queue Kanban) | `TELEGRAM_STUDIO_BOT_TOKEN` (`/bot/studio/webhook/`) | [`docs/03_PRODUCT_3D_STUDIO_PRINTING/`](docs/03_PRODUCT_3D_STUDIO_PRINTING/) |

---

## 📁 Hujjatlar Tuzilmasi (`docs/`)

Har bir mahsulot va umumiy arxitektura bo'yicha to'liq qo'llanmalar `docs/` jildida jamlangan:

```
docs/
├── 00_ARCHITECTURE_MASTER/
│   ├── MASTER_ECOSYSTEM_OVERVIEW.md       # 3 mahsulotli ekotizim umumiy arxitekturasi
│   ├── MULTI_BOT_AND_MINI_ERP_ARCHITECTURE.md # Ko'p botli marshrutlash va ERP xaritasi
│   └── DEVELOPER_AND_AI_GUIDE.md          # Dasturchi va AI uchun qat'iy qoidalar
├── 01_PRODUCT_RESTAURANT_3D_AR/
│   ├── README.md                          # Mahsulot #1 umumiy tavsifi va xususiyatlari
│   ├── CODEBASE_MAP.md                    # Restoran backend, frontend va template fayllari
│   ├── MINI_ERP_SPECIFICATION.md          # Stollar, KDS (oshxona), ofitsiant paneli
│   └── BOT_AND_UI_DESIGN.md               # Telegram bot va 3D Web UI dizayni
├── 02_PRODUCT_MARKETPLACE_ONLINE_STORE/
│   ├── README.md                          # Mahsulot #2 umumiy tavsifi
│   ├── CODEBASE_MAP.md                    # Gipermarket backend va mobil ilova fayllari
│   ├── MINI_ERP_SPECIFICATION.md          # Mahsulotlar, buyurtmalar, kuryerlar paneli
│   └── BOT_AND_UI_DESIGN.md               # Do'kon boti va katalog UI
├── 03_PRODUCT_3D_STUDIO_PRINTING/
│   ├── README.md                          # Mahsulot #3 umumiy tavsifi
│   ├── CODEBASE_MAP.md                    # STL/OBJ yuklash, slicer hisoblagich fayllari
│   ├── MINI_ERP_SPECIFICATION.md          # Chop etish navbati (Print Kanban)
│   └── BOT_AND_UI_DESIGN.md               # 3D studio boti va model vizualizatsiyasi
└── 04_SHARED_MODULES_AND_ARCHIVE/
    ├── SHARED_CORE_ENGINE.md              # Umumiy Django modullari (Auth, Payme, Storage)
    └── ARCHIVE_SPECS/                     # Tarixiy va eski TZ fayllari arxivi
```

---

## 🛠 Ishga Tushirish va Testlash

### Virtual muhit va bog'liqliklar
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Serverni ishga tushirish
```bash
./scripts/start_server.sh
# yoki to'g'ridan-to'g'ri:
python manage.py runserver 0.0.0.0:8000
```

### Testlarni ishga tushirish
```bash
# 1. Django modulli testlari (25/25 OK)
python manage.py test ar3d shops notifications

# 2. To'liq integratsion regressiya tekshiruvi (45/45 PASS)
python scripts/loop_engineering_test.py
```

---

## 🤖 Dasturchi va AI uchun Qoidalar

1. **Aralashtirmaslik:** Mahsulot #1 (Restoran) bo'yicha vazifa bajarayotganda `customer_home` yoki marketplace kodlariga tegmang.
2. **Marshrutlar:**
   - Restoran doimo asosiy `/` va `/restaurant/` da ishlaydi.
   - Marketplace doimo `/market/` da ishlaydi.
   - 3D Studio doimo `/studio/` da ishlaydi.
3. **Botlar:** Har bir mahsulot o'z webhook endpointiga ega (`/bot/restaurant/webhook/`, `/bot/market/webhook/`, `/bot/studio/webhook/`).
4. **Batafsil qo'llanma:** Yangi funksiya qo'shishdan oldin [`docs/00_ARCHITECTURE_MASTER/DEVELOPER_AND_AI_GUIDE.md`](docs/00_ARCHITECTURE_MASTER/DEVELOPER_AND_AI_GUIDE.md) faylini o'qing.
