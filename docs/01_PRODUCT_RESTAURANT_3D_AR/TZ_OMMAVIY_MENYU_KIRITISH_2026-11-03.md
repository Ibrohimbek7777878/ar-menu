# TZ — Menyuni ommaviy kiritish: rasm / matn / fayldan o'qish, internetdan rasm topish

**Sana:** 2026-11-03 · **Holat:** egasi ko'rsatma berdi ("rasm tashlanganda tizim o'zi o'qib joylashtirsin va tasdiq so'rasin; nom kiritilganda internetdan rasm topib tanlash imkonini bersin; Samsung/iPhone eslatmalari, Excel, Word, PDF, CSV o'qilsin"). Bu hujjat — to'rt agent uchun YAGONA SHARTNOMA.

## Maqsad
Yangi restoranda 50 ta taomni bitta-bitta kiritmasdan, 10–15 daqiqada kiritish. Hech narsa **foydalanuvchi tasdig'isiz** bazaga yozilmaydi.

## Oqim
1. `/ra/` → Menyu → **"Ommaviy qo'shish"**: fayl tashlash / matn joylash (Samsung/iPhone eslatmasidan nusxa) / rasm (qog'oz menyu yoki taom surati).
2. Server o'qiydi → **ko'rib chiqish jadvali**: har qator (nom, narx, bo'lim, tavsif) tahrirlanadi, belgi qo'yib olib tashlanadi; xavfli joylar belgilanadi (narx 1000 dan kichik, takror nom, mavjud taom).
3. Har qatorda **"Internetdan rasm topish"** → variantlar → tanlash (yoki o'z rasmini yuklash).
4. **"Tasdiqlash va qo'shish"** → hammasi bitta tranzaksiyada yoziladi → natija + **"Oxirgi importni qaytarish"** (arxivlash, o'chirmaydi).
Yakka taom formasida ham nom yoniga "Internetdan rasm topish" tugmasi.

## Qamrov va chegaralar (qat'iy)
- Formatlar: matn (joylangan), `.txt`, `.csv`, `.xlsx`, `.docx`, `.pdf`, rasm (`jpg/png/webp`). `.xls`, `.doc`, Samsung `.sdocx/.memo`, `.pages`, `.numbers` **o'qilmaydi** — 415 va aniq maslahat ("Excel/Word'da «Boshqacha saqlash → .xlsx / .docx» qiling; Samsung Notes'da «Ulashish → PDF/Matn»; iPhone Eslatmalarda «Nusxa olish» yoki PDF").
- Hajm: fayl ≤ 10 MB, rasm ≤ 10 MB, PDF ≤ 10 bet (AI/OCR uchun ≤ 8 bet), qatorlar ≤ 300, zip ichi (xlsx/docx) ≤ 50 MB ochilganda va ≤ 2000 yozuv (zip-bomba himoyasi), parser vaqti ≤ 20 s, AI chaqiruv ≤ 25 s.
- Xavfsizlik: faqat o'z restorani (`staff_shop`), faqat `RestoAdminAPIView` ruxsatlari, fayl tarkibi ishonchsiz (HTML/skript tozalanadi, nom/tavsif uzunligi chegarasi `NAME_MAX`/`DESCRIPTION_MAX`), formula (`=+-@`) bilan boshlanuvchi nomlar tozalanadi, restoranga soatiga 20 ta parse so'rovi (kesh asosida), AI natijasi hech qachon ishonilmaydi — baribir bir xil tekshiruvdan o'tadi.
- Hech narsa o'chirilmaydi (AGENTS 4): "qaytarish" = arxivlash (`is_deleted`, mavjud mexanizm). Dinamik: sozlama `menu_import_ai` (`on` standart | `off`) — `off` bo'lsa rasm/matn **uchinchi tomonga yuborilmaydi**, faqat lokal usullar (jadval/matn qoidalari, Tesseract OCR) ishlaydi.
- Lokal serverda Tesseract faqat `eng` bilan; production Docker'da `eng+rus+uzb` (Dockerfile yangilangan). Tesseract topilmasa OCR o'tkazib yuboriladi va aniq xabar beriladi.

## Ma'lumotlar bazasi (allaqachon qo'shilgan: products 0020)
`Product.image_credit` (CharField 255), `Product.image_source_url` (URLField 500), `Product.import_batch` (CharField 36, indeks). Boshqa migratsiya YOZMANG.

## API (hammasi `/api/restaurant/admin/v1/menu/` ostida, CSRF/sessiya mavjud adminnikidek)

### 1) `POST import/parse/` — multipart: `file` YOKI `text` (ikkalasi emas)
200:
```json
{
  "source": "text|csv|xlsx|docx|pdf|image",
  "engine": "table|rules|ocr|ai",
  "kind": "menu|dish_photo",
  "truncated": false,
  "rows": [{
    "row_id": "r1", "name": "Palov", "price": 45000, "category": "Milliy taomlar", "description": "",
    "image_token": null, "warnings": ["price_small", "name_exists"],
    "existing_product_id": null, "existing_category_id": 3, "duplicate_in_file": false
  }],
  "categories": [{"name": "Milliy taomlar", "existing_id": 3}],
  "notes": ["4 ta qator o'qilmadi"], "stats": {"lines": 42, "recognized": 38, "skipped": 4}
}
```
- `price`: butun so'm (`int`) yoki `null` (narx topilmadi → `warnings` ichida `price_missing`). `45k`, `45 ming`, `45 000`, `45.000`, `45,000`, `45000 so'm/sum/сум/UZS` tan olinadi. 1000 dan kichik (lekin >0) son → `price_small` (qiymat o'zgarmaydi, UI "×1000?" taklif qiladi).
- `warnings` kodlari: `price_missing`, `price_small`, `price_large` (>5 000 000), `name_exists` (shu restoranda shunday nom bor: `existing_product_id`), `duplicate_in_file`, `category_new`, `low_confidence` (AI/OCR ishonchsiz).
- `kind=dish_photo`: bitta taom surati; bitta qator (`name` taxmin, `description` qisqa, `category` taxmin, `price: null`) va `image_token` (suratning o'zi vaqtincha saqlangan).
- Xatolar: `400 {error, code}` (bo'sh/yaroqsiz), `413 file_too_large`, `415 unsupported_type` (+ maslahat matni), `422 nothing_recognized` (+ nima qilish kerak), `429 rate_limited`, `503 ai_unavailable` (faqat AI shart bo'lgan holatda; matn/jadval hech qachon AI'ga bog'liq emas).

### 2) `POST import/commit/` — JSON
```json
{"submission_id": "uuid", "rows": [{
  "row_id": "r1", "name": "Palov", "price": 45000, "category": "Milliy taomlar", "category_id": 3,
  "description": "", "image_token": "…", "mode": "create|update|skip", "existing_product_id": null
}]}
```
- Hamma qator avval tekshiriladi; BIR QATOR XATO bo'lsa HECH NARSA yozilmaydi: `400 {error, rows:[{row_id, field, message}]}`.
- Yo'q bo'lim nom bo'yicha yaratiladi (`name`, `name_uz`, `name_ru`=nom, `is_active`, `is_restaurant`=true, `kind` bo'sh). `update` — faqat narx/tavsif/rasm (nom, tarjima, 3D tegilmaydi).
- `submission_id` bo'yicha idempotent (qayta yuborilsa avvalgi natija qaytadi). Hammasi bitta `transaction.atomic()`; rasm fayllari tranzaksiyadan keyin.
- 200 `{batch_id, created, updated, skipped, categories_created:[…], products:[{row_id,id}]}`; audit log yoziladi.
- Menyu keshi mavjud signal orqali yangilanadi (`products/menu_cache.py`).

### 3) `POST import/undo/` — `{ "batch_id": "…" }`
Shu partiyada **yaratilgan** va keyin o'zgartirilmagan (`updated_at == created_at` emas — oddiy tekshiruv: shu partiya, hali `is_deleted=False`) taomlarni arxivlaydi (mavjud soft-delete). `200 {archived: n}`. Boshqa restoran partiyasi → 404.

### 4) `POST import/photo/` — multipart `image` → `{ "image_token": "…", "preview_url": "…" }`
Qatorga o'z rasmini biriktirish uchun (mijozda 1600 px gacha kichraytirilgan keladi; serverda baribir tekshiriladi, EXIF olib tashlanadi, ≤ 1600 px, JPEG).

### 5) `GET image-search/?q=Palov` → internetdan rasm variantlari
```json
{"query_used": "plov pilaf", "results": [{
  "id": "openverse:20c5…", "thumb": "https://…", "full": "https://…",
  "title": "Plov, Tashkent", "creator": "Boonlong1", "license": "by", "license_url": "https://…",
  "source": "openverse|wikimedia", "source_url": "https://…"}]}
```
- Manbalar: **Openverse** (`https://api.openverse.org/v1/images/`) va **Wikimedia Commons** (`https://commons.wikimedia.org/w/api.php`), ikkalasi kalitsiz. Google/Bing rasm qidiruvini **scrape QILMANG** (shartlarni buzadi, mualliflik huquqi).
- Faqat litsenziyalar: `cc0`, `pdm`, `by`, `by-sa` (tijoriy ishlatish va o'zgartirish mumkin). `nd`/`nc` — rad etiladi. Natija soni ≤ 12, 1 soat keshlanadi, restoranga soatiga 60 so'rov, tashqi so'rov timeout 8 s.
- Qidiruv so'zi: nom + "food dish"; nom o'zbekcha bo'lsa lug'at (Palov→plov pilaf, Lag'mon→lagman, Manti→manti, Shashlik→shashlik kebab, Somsa→samsa, Chuchvara→chuchvara dumplings, Norin→norin, Mastava, Sho'rva→soup, Dolma, Qozon kabob, Achchiq-chuchuk→tomato onion salad, Choy→tea, Non→flatbread bread, …) va (agar AI yoqiq bo'lsa) AI tarjima; topilmasa nomning o'zi.

### 6) `POST image-search/pick/` — JSON `{id, full, title, creator, license, license_url, source_url}` → `{ "image_token": "…", "preview_url": "…", "credit": "Boonlong1 · CC BY" }`
Server rasmni **o'zi yuklab oladi** (hotlink emas). SSRF himoyasi: faqat `https`, host Openverse/Wikimedia natijasida kelgan va ruxsat ro'yxatidagi domenlardan (`upload.wikimedia.org`, `live.staticflickr.com`, `*.staticflickr.com`, `images.pexels.com` va h.k. ro'yxat sozlanadi), IP manzil private/loopback bo'lsa rad, redirect ≤ 3 va har birida qayta tekshiruv, ≤ 6 MB, Content-Type `image/*`, Pillow bilan ochilib tekshiriladi, ≤ 1600 px, EXIF yo'q, JPEG.

### 7) Taom API'lariga `image_token` (mavjud `POST/PATCH products/…`)
`image_token` berilsa rasm shu tokendan olinadi. Token yuklashdan kelsa (`import/photo`, `dish_photo`) → `has_real_photo=true`, `image_credit=''`. Internetdan (`image-search/pick`) kelsa → `has_real_photo=false`, `image_credit`, `image_source_url` to'ldiriladi. Haqiqiy rasm yuklansa kredit tozalanadi. Token: 2 soat amal qiladi, faqat shu restoran, bir marta ishlatiladi (`commit` ichida ham).

### 8) Sozlama `menu_import_ai` (`on` | `off`, standart `on`)
`GET/PATCH /api/restaurant/admin/v1/settings/` (`guest_dish_sheet` kabi). `/ra/` sozlamalarida tanlov: "Menyuni AI orqali o'qish".

## Mehmon tomoni (alohida kichik ish)
Taom oynasida (`DishSheet`) `image_credit` bo'lsa rasm ostida kichik yozuv: "Rasm: {credit}" (havola `image_source_url`). Menyu javobidagi `guest_dish_extras` ga `image_credit` qo'shiladi (faqat bo'lmasa kalit yo'q).

## Modul tuzilmasi (fayl egalari — boshqasining faylini TAHRIRLAMANG)
- `backend/products/menu_import/readers.py`, `text_parser.py`, `service.py` + `backend/orders/interfaces/api/menu_import_views.py`, `menu_import_urls.py` — **B1a**
- `backend/products/menu_import/vision.py`, `ocr.py`, `image_tokens.py` + `backend/shops/menu_import_ai.py` (sozlama), settings_admin.py'ga `menu_import_ai` qo'shish — **B1b**
- `backend/products/menu_import/image_search.py`, `image_fetch.py` + `backend/orders/interfaces/api/menu_images_views.py`, `menu_images_urls.py` + `image_token` qo'llash `menu_admin.py` ichida (POST/PATCH) — **B2**
- `admins/resto/src/pages/Menu/…` (yangi `BulkImport/` papkasi, `Page.tsx` ga kirish tugmasi, dish formasiga rasm tanlagich), `admins/resto/src/pages/Settings/…` (`menu_import_ai` tanlovi), `admins/resto/src/i18n/uz.ts` — **F1**
- Interfeys B1a ↔ B1b:
  ```python
  # vision.py
  @dataclass
  class VisionResult: kind: str; rows: list; engine: str; notes: list   # kind: 'menu'|'dish_photo'|'unknown'; rows: [{name, price|None, category, description}]
  def read_image(image_bytes: bytes, *, shop=None) -> VisionResult      # AI (menu_import_ai=on va kalit bor) -> aks holda OCR -> aks holda bo'sh + notes
  def read_scanned_pdf(pdf_bytes: bytes, *, shop=None, max_pages=8) -> VisionResult
  def structure_text_with_ai(text: str, *, shop=None) -> VisionResult | None  # tartibsiz matnni AI bilan tartiblash; AI o'chiq/yo'q bo'lsa None
  # image_tokens.py
  def store_temp_image(image_bytes: bytes, shop_id: int, *, credit='', source_url='', real_photo=True) -> str   # token
  def peek_temp_image(token, shop_id) -> dict | None                # {path, credit, source_url, real_photo}
  def consume_temp_image(token, shop_id) -> dict | None             # bir martalik; Django File obyektiga aylantirish uchun bytes qaytaradi
  def cleanup_expired(): ...                                        # 2 soatdan eski vaqtincha fayllarni o'chiradi (vaqtinchalik fayl — mahsulot emas, o'chirish ruxsat)
  ```

## AI (Groq, mavjud `AI_PROVIDER=groq` + `AI_API_KEY`)
OpenAI-mos `chat/completions`, model `settings.AI_VISION_MODEL` (env `AI_VISION_MODEL`, standart `qwen/qwen3.8-27b` — sintetik menyu rasmida sinab ko'rildi, 6/6 qator to'g'ri). Rasm `data:image/jpeg;base64,…` (≤ 1600 px, ~300 KB), `temperature 0`, JSON qaytarish. Kalit/model xato bersa → OCR → "AI hozir ishlamayapti" xabari. Kalit log'ga yoki javobga HECH QACHON chiqmaydi.

## Qabul mezonlari
1. 50 qatorli Excel/CSV/Word/PDF/matn → jadval 3 soniyada chiqadi (AI'siz); tasdiqlangach 50 taom bitta so'rovda yoziladi.
2. Samsung/iPhone eslatmasidan joylangan matn ("Palov - 45 000", "Osh 45k", sarlavha qatorlari bo'lim bo'ladi) to'g'ri o'qiladi; tartibsiz matn AI bilan tartiblanadi (AI yoqiq bo'lsa).
3. Qog'oz menyu surati (toza) → qatorlar; taom surati → `dish_photo` bitta qator + surat biriktirilgan.
4. Internetdan rasm: qidiruv natijalari litsenziya belgisi bilan; tanlangan rasm serverga yuklanadi, kredit saqlanadi, mehmon oynasida ko'rinadi; `nd`/`nc` ko'rinmaydi.
5. Tasdiqsiz hech narsa yozilmaydi; bitta xato qator hamma yozuvni to'xtatadi va qaysi qator ekanini aytadi; qayta yuborish takror yaratmaydi; "qaytarish" arxivlaydi.
6. Boshqa restoran ma'lumotiga hech qanday yo'l yo'q (testlar); katta/buzuq/zip-bomba/formula fayllar xavfsiz rad etiladi.
7. Testlar: backend (yangi modullar), admins (vitest), mavjud to'plam yashil; `ruff` toza.
