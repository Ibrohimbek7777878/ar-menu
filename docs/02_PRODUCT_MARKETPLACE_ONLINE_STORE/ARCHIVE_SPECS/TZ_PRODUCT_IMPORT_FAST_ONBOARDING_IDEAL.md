# TZ — Oziq-ovqat va Dehqonchilik Mahsulotlarini Tezkor Kiritish Tizimi (Agro & Food Fast Ingestion Engine)

**Loyiha:** Online Store Guliston — Gipermahalliy Oziq-ovqat va Dehqon Bozori Marketplace  
**Soha / Yo'nalish:** **Faqat Oziq-ovqat (Grocery / Supermarket) va Dehqonchilik (Yangi meva-sabzavot, poliz, go'sht, sut, don mahsulotlari)**  
*(Eslatma: Dorixona, dori-darmon va boshqa begona sohalar mutlaqo kiritilmaydi va loyihada mavjud emas)*  
**Hujjat Turi:** Mukammal / Ideal Texnik Topshiriq (Master Technical Specification)  
**Versiya:** 2.1 (Domain-Specific: Agro & Food Only) · **Sana:** 2026-09-15  

---

## 1. Loyihaning Haqiqiy Mohiyati va Bozor Sharoiti

Guliston va Sirdaryo hududi — yirik dehqonchilik, polizchilik, chorvachilik va oziq-ovqat savdosi markazidir.
Loyihaning asosiy maqsadi:
1. **Oziq-ovqat do'konlari (Supermarket, Baqqollik, Minimarketlar)** — qadoqlangan oziq-ovqat tovarlari (un, moy, shakar, choy, ichimliklar, non, konservalar).
2. **Dehqonlar, fermerlar, qassoblar va sut yetishtiruvchilar (Guliston Dehqon Bozori)** — yangi uzilgan sabzavotlar, mevalar, poliz ekinlari, go'sht-sut, don va dukkakli mahsulotlar.

### ⚠️ Asosiy To'siq:
* **Dehqonchilik mahsulotlarida shtrix-kod (barcode) bo'lmaydi!** (Pomidor, kartoshka, uzum yoki go'shtda shtrix-kod yo'q).
* **Dehqon yoki sotuvchi rasmga olib o'tirishga vaqti yo'q:** Qo'li band bo'lgan dehqon yoki qassob telefonida mahsulotni bittalab rasmga olib, tavsif yozib o'tirmaydi.
* **O'lchov birliklari xilma-xil:** Tovar dona emas, balki **kg (kilogramm)**, **litr**, **bog'** (ko'katlar), **qop** (ulgurji kartoshka/piyoz), **yashik** (mevalar) bo'yicha sotiladi.
* **Kunlik bozor narxlari o'zgarishi:** Sabzavot va mevalar narxi dehqon bozorida har kuni ertalab o'zgaradi (masalan, bugun pomidor 7,000 so'm, ertaga 9,000 so'm). Narxni 10 soniyada ommaviy yangilash imkoni bo'lishi shart!

---

## 2. Omni-Import Arxitekturasi: Oziq-ovqat va Dehqonchilik Uchun 6 Ta Tezkor Usul

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             GULISTON AGRO & FOOD — MAHSULOT KIRITISH TIZIMI                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
[1. AGRO MASTER KATALOG]      [2. SHTRIX-KOD SKANER]        [3. VISUAL TOUCH GRID]
1 klikda Dehqon Bozori        Qadoqlangan oziq-ovqatlar      Shtrix-kodsiz sabzavot,
TOP to'plamlari (Meva,        uchun (choy, un, moy, suv...)  meva, go'sht, sutni rasmli
Sabzavot, Go'sht, Sut, Don)   3 soniyada rastadan kiritish   paneldan 1 bosishda tanlash
       │                              │                              │
       ├──────────────────────────────┼──────────────────────────────┤
       │                              │                              │
[4. KUNLIK NARX YANGILASH]    [5. SMART EXCEL/CSV]          [6. AI FAKTURA OCR]
Barcha sabzavot/mevalar       Ulgurji ombor va do'konlar    Ta'minotchi qog'oz
narxini 1 sahifada 10         uchun tayyor jadval orqali    nakladnoyini suratga olib
soniyada ommaviy o'zgartirish ommaviy 300 ta tovar kiritish  avtomatik tovar yaratish
       └──────────────────────────────┴──────────────────────────────┘
```

---

### 1-USUL: Agro & Food Master Katalog — Tayyor "Starter Packs" (1 Klikda Assortiment)

Sotuvchi do'konini ro'yxatdan o'tkazgach, tizim uning do'kon turiga qarab **tayyor boshlang'ich to'plam** taklif qiladi:

#### A) Tayyor To'plamlar Ro'yxati:
1. **"Dehqon Bozori — Sabzavotlar & Ko'katlar TOP-30":**
   * Kartoshka (kg), Piyoz (kg), Sabzi qizil/sariq (kg), Pomidor yusupov/pushti (kg), Bodring (kg), Karam (kg), Baqlajon (kg), Bulg'or qalampiri (kg), Sarimsoqpiyoz (kg), Qovoq (kg), Kashnich (bog'), Shivit (bog'), Rayhon (bog'), Petrushka (bog'), Ko'k piyoz (bog')...
2. **"Dehqon Bozori — Mevalar va Poliz Ekinlari TOP-25":**
   * Tarvuz (kg/dona), Qovun (kg/dona), Olma besh yulduz/golden (kg), Nok (kg), Uzum qora kishmish/husayni (kg), Shaftoli (kg), O'rik (kg), Anor (kg), Anjir (kg), Gilos (kg)...
3. **"Go'sht va Qassobxona TOP-15":**
   * Mol go'shti (lahm kg), Mol go'shti (suyakli kg), Qo'y go'shti (kg), Qiyma (kg), Mol jigari (kg), Qo'y qovurg'a (kg), Tovuq go'shti (butun kg), Tovuq filesi (kg), Tovuq soni (kg), Tuxum (dona/30talik katak)...
4. **"Tabiiy Sut va Qatiq Mahsulotlari TOP-15":**
   * Qishloq suti (tabiiy litr), Qatiq (litr/banka), Suzma (kg), Qaymoq (kg/banka), Chakka (kg), Qo'lbola sariyog' (kg), Tvorog (kg), Sho'r qurt (kg/dona), Brinza pishloq (kg)...
5. **"Don, Dukkaklilar va Guruch Bozori TOP-20":**
   * Guruch Lazer (kg), Guruch Alanga (kg), Guruch Devzira (kg), Mosh (kg), Qizil loviya (kg), No'xat (kg), Bug'doy (kg), Arpa (kg)...
6. **"Supermarket & Oziq-ovqat Baqqollik TOP-50":**
   * Samarqand noni, Tandir non, Patir, O'simlik yog'i (Paxta/Pista 1L, 5L), Shakar (kg), Oliy nav un (Makfa/Qozoq 1kg, 2kg, 50kg qop), Choy (Ko'k 95, Qora 100g), Tuz (osh tuzi kg), Makaron mahsulotlari, Tomat pastasi...

#### B) Sotuvchi Oqimi:
1. Dehqon/sotuvchi masalan: **"Sabzavotlar & Ko'katlar"** to'plamini tanlaydi.
2. Tizim 30 ta tovarning professional toza rasmlari, o'zbekcha nomlari va o'lchov birliklari (`kg`, `bog'`) bilan 1 soniyada do'konga yuklaydi.
3. Dehqon faqat bugungi bozor narxini tasdiqlaydi — va do'kon darhol mijozlarga sotuvga tayyor!

---

### 2-USUL: Visual Touch Grid (Shtrix-kodsiz Tovarlar Uchun Rasmga Bosish)

Dehqonchilik tovarlarida shtrix-kod yo'qligi sababli, mobil ilova va planshetda **Kassa Ikonkalari Paneli** ishlaydi:
* Ekranda chiroyli HD kartochkalar turadi:  
  `[🥔 Kartoshka] [🧅 Piyoz] [🥕 Sabzi] [🍅 Pomidor] [🥩 Mol go'shti] [🍉 Tarvuz] [🥛 Sut]`
* Sotuvchi bitta bosadi:
  * **O'lchov birligi:** avtomatik `kg` (yoki `litr`, `bog'`).
  * **Narxi:** Masalan: `5,000` so'm.
  * **Qoldig'i:** `150` kg.
* **[Qo'shish]** tugmasi bosiladi — 3 soniya kifoya!
* Sotuvchi loyli yoki ho'l qo'li bilan rasm qidirib, matn yozib o'tirmaydi!

---

### 3-USUL: Qadoqlangan Oziq-ovqatlar Uchun Shtrix-kod Skaneri

Supermarket, minimarket va baqqollikdagi qadoqlangan tovarlar uchun (yog', choy, un, makaron, ichimliklar, pechenye):
* Telefon kamerasi qutidagi shtrix-kodga (EAN-13) qaratiladi.
* Tizim bazadan tovar nomini va rasmini chiqaradi (masalan: *"Dena Olma sharbati 1L"*).
* Sotuvchi narxini (`12,000`) yozadi va saqlaydi.

---

### 4-USUL: Kunlik Bozor Narxlarini Tezkor Yangilash (Daily Agro Price Sync)

Dehqon bozorining o'ziga xosligi — narxlar har kuni ertalab o'zgaradi.
Agar sotuvchi 40 ta sabzavotning narxini o'zgartirish uchun 40 ta sahifaga kirib chiqsa, bu 20 daqiqa oladi.
Buning o'rniga bitta ekranda **"Bozor Narxlari Jadvali"** bo'ladi:

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 BUGUNGI BOZOR NARXLARI — 15-SENTYABR                     │
├──────────────────────┬─────────────┬───────────┬────────────┤
│ Mahsulot             │ Kechagi narx│ Bugun     │ Qoldiq     │
├──────────────────────┼─────────────┼───────────┼────────────┤
│ 🥔 Kartoshka (mahalliy)│ 4,000 so'm  │ [ 4,500 ] │ [ 200 kg ] │
│ 🧅 Piyoz             │ 2,500 so'm  │ [ 2,500 ] │ [ 350 kg ] │
│ 🍅 Pomidor Yusupov   │ 8,000 so'm  │ [ 7,000 ] │ [  80 kg ] │
│ 🥩 Mol go'shti lahm  │ 95,000 so'm │ [ 95,000] │ [  45 kg ] │
└──────────────────────┴─────────────┴───────────┴────────────┘
        [ BARChA NARXLARNI YANGILASH (1 KLIK) ]
```
Sotuvchi 1 daqiqa ichida barcha narxlarni ko'rib chiqadi va bitta tugma bilan yangilaydi!

---

### 5-USUL: Smart Excel / CSV Ommaviy Import

Omborlar va ulgurji bazalar uchun standart shablon:
* Ustunlar: `Shtrix-kod (ixtiyoriy) | Nomi * | Kategoriya * | Birligi (kg/dona/l) | Narxi * | Qoldiq *`
* Faylni yuklash — avtomatik tekshiruv — 1 klikda do'konga import.

---

### 6-USUL: AI Vision (Qog'oz Nakladnoy va Fakturani Suratga Olish)

* Ta'minotchi bergan qog'oz faktura (nakladnoy) telefon kamerasida rasmga olinadi.
* Gemini OCR jadvaldagi oziq-ovqatlar ro'yxatini (nomi, kg/soni, tan narxi) o'qiydi.
* Do'kon ustamasi qo'shilib (+15%), tovarlar avtomatik do'konga tushadi.

---

## 3. Ma'lumotlar Bazasi Modellar Arxitekturasi (Database Schema)

Mavjud `Product` modeliga aslo ziyon yetkazmasdan, oziq-ovqat va dehqonchilikka moslashtirilgan modellar kiritiladi:

### 1. `AgroMasterProduct` (Oziq-ovqat va Dehqonchilik Master Bazasi)
```python
# backend/products/models.py

class AgroMasterProduct(models.Model):
    """Oziq-ovqat va qishloq xo'jaligi standart tovarlar bazasi."""
    SECTOR_CHOICES = [
        ('vegetable', 'Sabzavotlar'),
        ('fruit', 'Mevalar va Poliz'),
        ('meat', "Go'sht va Parranda"),
        ('dairy', 'Sut va Qatiq mahsulotlari'),
        ('grain', 'Don va Dukkaklilar'),
        ('grocery', 'Qadoqlangan Oziq-ovqat / Baqqollik'),
        ('bakery', 'Non va Non mahsulotlari'),
        ('drinks', 'Ichimliklar'),
    ]

    UNIT_CHOICES = [
        ('kg', 'Kilogramm (kg)'),
        ('g', 'Gramm (g)'),
        ('dona', 'Dona'),
        ('litr', 'Litr (l)'),
        ('bog', "Bog' (ko'katlar)"),
        ('qop', 'Qop (50 kg)'),
        ('yashik', 'Yashik'),
    ]

    name = models.CharField(max_length=255, db_index=True)
    name_uz = models.CharField(max_length=255, blank=True)
    name_ru = models.CharField(max_length=255, blank=True)
    sector = models.CharField(max_length=30, choices=SECTOR_CHOICES, db_index=True)
    category = models.ForeignKey('categories.Category', on_delete=models.SET_NULL, null=True, blank=True)
    barcode = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    ikpu_code = models.CharField(max_length=64, blank=True, help_text="Soliq MXIK kodi")
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='kg')
    default_market_price = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    image = models.ImageField(upload_to='master_agro/', null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    is_seasonal = models.BooleanField(default=False, help_text="Mavsumiy tovar (qovun, uzum, gilos...)")
    is_organic = models.BooleanField(default=True, help_text="Tabiiy dehqonchilik")

    class Meta:
        db_table = 'agro_master_products'
        indexes = [
            models.Index(fields=['sector']),
            models.Index(fields=['name']),
            models.Index(fields=['barcode']),
        ]
```

### 2. `AgroStarterPack` va `AgroStarterPackItem`
```python
class AgroStarterPack(models.Model):
    """Oziq-ovqat va Dehqon Bozori to'plami (Sabzavot TOP-30, Mevalar TOP-25, Go'sht TOP-15...)"""
    name = models.CharField(max_length=150)
    sector = models.CharField(max_length=30, db_index=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='eco')
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'agro_starter_packs'
        ordering = ['sort_order', 'id']


class AgroStarterPackItem(models.Model):
    pack = models.ForeignKey(AgroStarterPack, on_delete=models.CASCADE, related_name='items')
    master_product = models.ForeignKey(AgroMasterProduct, on_delete=models.CASCADE)
    suggested_price = models.DecimalField(max_digits=12, decimal_places=0)
    default_stock = models.DecimalField(max_digits=10, decimal_places=2, default=50.0)  # kg yoki dona

    class Meta:
        db_table = 'agro_starter_pack_items'
        unique_together = [('pack', 'master_product')]
```

---

## 4. API Endpoints Spetsifikatsiyasi

| Endpoint | Metod | Ruxsat | Tavsif |
| :--- | :---: | :---: | :--- |
| `/api/v1/flutter/seller/agro/starter-packs/` | GET | IsAuthenticated | Dehqonchilik va Oziq-ovqat to'plamlari ro'yxati |
| `/api/v1/flutter/seller/agro/starter-packs/apply/` | POST | IsAuthenticated | Tanlangan to'plamni do'konga 1 klikda import qilish `{pack_id, shop_id}` |
| `/api/v1/flutter/seller/agro/master-search/` | GET | IsAuthenticated | Sektor yoki nom bo'yicha agro mahsulotlarni qidirish |
| `/api/v1/flutter/seller/agro/barcode-lookup/` | GET | IsAuthenticated | Qadoqlangan oziq-ovqat shtrix-kodini qidirish |
| `/api/v1/flutter/seller/agro/quick-price-update/` | POST | IsAuthenticated | Kunlik bozor narxlarini ommaviy yangilash `[{product_id, price, stock}]` |
| `/api/v1/flutter/seller/agro/excel-import/` | POST | IsAuthenticated | Excel/CSV fayl orqali ommaviy yuklash |
| `/api/v1/flutter/seller/agro/ocr-invoice/` | POST | IsAuthenticated | Qog'oz nakladnoy suratidan mahsulotlar ro'yxatini ajratish |

---

## 5. Buzmaslik Kafolati (Zero Regression)

1. **Dorixona va begona sohalar:** Barcha dorixona, farmatsevtika va tibbiyot komponentlari tizimdan to'liq chiqarildi va qo'shilmaydi.
2. **Mavjud tizimlar daxlsizligi:** Mavjud `Product` modeli, buyurtmalar oqimi, kuryerlar tizimi, AR 3D menyu, restoran stollari va savat izolyatsiyasi o'z holatida saqlanadi.
3. **Standart birliklar:** Tizim dehqonchilik uchun `kg`, `g`, `bog'`, `litr`, `qop`, `yashik` birliklarini to'liq qo'llab-quvvatlaydi.
