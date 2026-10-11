ONLINE STORE GULISTON — AI/AR/ECOSYSTEM
TEXNIK TOPSHIRIQ
Hujjat: TECHNICAL_SPECIFICATION_V6.md
Sana: 2026-08-17
Versiya: 6.0
Maqsad: Guliston va keyinchalik O‘zbekiston bozoriga mo‘ljallangan lokal e-commerce
ekotizimi: marketplace, tezkor logistika, AI marketing, AI chatbot, AR/3D mahsulot ko‘rish,
to‘lovlar, xarita, PWA va mobil ilova.
Muhim xavfsizlik eslatmasi: oldingi handoff hujjatida Telegram bot tokeni ochiq
yozilgan. Uni darhol BotFather orqali yangilang (revoke/rotate), eski tokenni ishlatishni
to‘xtating va barcha maxfiy kalitlarni faqat .env/secret manager’da saqlang. Git
tarixidan ham olib tashlang.

1. Vizyon va mahsulot pozitsiyasi
   1.1. Muammo
   Guliston va Sirdaryo bozorida xaridorlar bir joydan mahsulot qidirish, do‘konni solishtirish,
   ishonchli yetkazib berish, tez to‘lov va buyurtmani kuzatish imkoniyatiga muhtoj. Mahalliy
   do‘konlar esa raqamli katalog, marketing dizayni, reklama, mijoz tahlili va logistika
   boshqaruvida qiynaladi.
   1.2. Yechim
   Online Store Guliston quyidagi tizimlarni bir platformada birlashtiradi:
   Mahalliy do‘konlar marketplace’i
   Xaridor uchun web/PWA va Flutter mobil ilova
   Shop owner uchun admin kabineti
   Kuryer uchun mobil/PWA kabineti
   AI marketing agenti va dizayn generatori
   AI chatbot: qidirish, savatga qo‘shish, buyurtma, tracking, yordam
   3D/AR mahsulot ko‘rish va QR-kod
   Xarita, yetkazib berish zonalari va real vaqt tracking
   Click, Payme, Uzum/UzCard/Humo va naqd to‘lovlar
   CRM, sodiqlik, referral, reklama va analitika1.3. Differensial afzallik
   Platforma “eng katta marketplace” bo‘lishdan oldin “eng foydali lokal commerce operating
   system” bo‘lishi kerak:
1. Mahalliy assortiment va 1–2 soatlik yetkazib berish
1. Do‘konlar uchun past komissiya va kuchli savdo vositalari
1. Uzbek tilida tabiiy ishlaydigan AI yordamchi
1. Ishonch: aniq yetkazish vaqti, real stock, qaytarish qoidasi, verifikatsiya
1. AI poster, katalog kontenti va AR ko‘rish orqali sotuvni oshirish
1. Telegram-first oqimlar: buyurtma, kuryer va promo xabarlari
1. Hozirgi platforma holati
   Mavjud stack:
   Django + Django REST Framework + SimpleJWT
   SQLite (MVP), production uchun PostgreSQL
   Django Templates + Tailwind CDN + Alpine.js
   Leaflet + OpenStreetMap + OSRM
   Telegram bildirishnomalari
   UZ/RU/EN til tizimi
   Service Worker va offline-first cache
   Customer, Admin, Courier, Payment, Map modullari
   2.1. Productionga majburiy o‘tishlar
   SQLite → PostgreSQL 16+
   Local media → S3-compatible storage (Cloudflare R2, AWS S3 yoki MinIO)
   Redis: cache, Celery broker, chatbot session, rate-limit
   Celery + Celery Beat: background tasks va retry
   Nginx + Gunicorn/Uvicorn
   Docker Compose va CI/CD
   Sentry monitoring
   .env va secret manager
   DEBUG=False, HSTS, CSRF/CORS, security headers
   Avtomatik backup: DB har kuni, media har hafta3. Bozor va raqobat strategiyasi
   O‘zbekistonda Uzum, Olcha, Asaxiy, Wildberries va tezkor delivery servislar xaridor e’tiborini
   egallaydi. Katta platformalar assortiment, nasiya va brend kuchi bilan ustun; lokal
   platformaning imkoniyati esa yaqin do‘kon, tez xizmat, real stock, mahalliy til, individual
   servis va past savdogar komissiyasidadir.
   3.1. Raqobat jadvali
   Mezoni
   Katta marketplace
   Tez delivery servisiOnline Store Guliston maqsadi
   AssortimentJuda kengOziq-ovqatga yaqinLokal ehtiyojlar + vertikal kategoriyalar
   Yetkazish1–bir necha kun20–60 daqiqa30–120 daqiqa, zona bo‘yicha
   Mahalliy do‘konKomissiya va qoidalar qattiqCheklanganPast komissiya, oson onboarding
   AI marketingCheklangan yoki yopiqCheklanganPro seller uchun avtomatik poster/kontent
   AR/3DNoyobDeyarli yo‘qMebel, kiyim, tort/pitsa, premium mahsulotlar
   SupportMass-marketMass-marketTelegram/telefon/live chat, lokal operator
   XaritaCheklanganKuchliDo‘kon + kuryer + pickup + delivery zone
   3.2. 5 yilga ustunlik beradigan prinsiplar
   Avval bitta shaharni ideal qiling; keyin viloyatga kengaying.
   “Hamma mahsulot” emas, eng tez-tez sotiladigan 5–8 kategoriya bilan product-market fit
   toping.
   Har bir buyurtma bo‘yicha SLA o‘lchang: qabul qilish, tayyorlash, olib ketish, yetkazish
   vaqti.
   Marketplace emas, seller SaaS ham soting: AI poster, CRM, analitika, reklama va stock
   yordamchisi.
   AI va AR’ni reklama emas, konversiya o‘lchovi bilan joriy qiling.
   Yandex yoki boshqa agregatorga to‘liq qaram bo‘lmang; gibrid logistika qiling.
1. Foydalanuvchi rollari
   4.1. Xaridor
   Ro‘yxatdan o‘tish: telefon OTP, Telegram yoki email
   Katalog, qidiruv, filtrlash, savat
   Shop va mahsulot baholash
   Xarita orqali yaqin do‘konlar
   Yetkazib berish yoki pickup
   To‘lov, tracking, qayta buyurtmaAI chatbot va voice input
   AR/3D view, QR scan
   Bonus, referral, promokod
   4.2. Do‘kon egasi
   Do‘kon profili, ish vaqti, zonalar, minimal buyurtma
   Mahsulot CRUD, ombor qoldig‘i, narx, aksiyalar
   Pro tarifda AI dizayn va marketing agent
   Buyurtma qabul qilish va tayyorlash statusi
   Sotuv, konversiya, top mahsulotlar analitikasi
   Reklama kampaniyasi va sponsor slotlari
   Xodim rollari: owner, manager, operator, packer
   4.3. Kuryer
   Login va online/offline status
   Buyurtmani olish/rad etish
   Pickup va delivery navigatsiyasi
   Jonli lokatsiya yuborish
   OTP yoki tasdiqlash kodi bilan topshirish
   Kunlik daromad va performance
   4.4. Platforma admini
   Seller verifikatsiyasi
   Kategoriya, komissiya, delivery zone, promo boshqaruvi
   Moderatsiya: mahsulot, rasm, AI natija, review
   To‘lov reconciliation
   Kuryer va logistika monitoringi
   AI xarajat limiti va audit
   Fraud/risk monitoring
1. Mahsulot modullari5.1. Core commerce
   Katalog, kategoriya, brend, tag
   Full-text qidiruv va synonymlar
   Variantlar: rang, o‘lcham, vazn, hajm
   Inventory reservation
   Multi-shop cart: MVPda do‘konlar bo‘yicha alohida checkout; keyin splitting
   Promo code, bundle, upsell, cross-sell
   Wishlist va recently viewed
   Review, foto-review, Q&A
   5.2. Delivery va logistics
   Delivery zonasi: poligon yoki radius
   Dinamik delivery fee: masofa, vaqt, og‘irlik, talab
   ETA: do‘kon tayyorlash va kuryer masofasiga bog‘liq
   Courier assignment: auto-dispatch + manual override
   Pickup point
   Delivery proof: OTP, foto yoki signature
   Failed delivery va refund workflow
   5.3. Marketing va CRM
   Segmentlar: yangi, faol, qaytmayotgan, VIP
   Trigger kampaniyalar: abandoned cart, reorder, birthday, price drop
   Referral: taklif qiluvchi va yangi foydalanuvchiga mukofot
   Loyalty: ball, level, cashback
   A/B testing: banner, promo, delivery threshold
   Consent management: marketing xabarlari uchun ruxsat
   5.4. In-app browser
   Mobil ilovada mini-brauzer faqat xavfsiz whitelisted URL’lar uchun ishlaydi:
   To‘lov provayderi checkout sahifasi
   Seller verified external catalog yoki video
   Help/FAQ sahifalari
   Deep-link handling
   Cheklovlar:
   Foydalanuvchi paroli yoki karta ma’lumotini ilova ichida saqlamaslikFaqat HTTPS
   External URL warning
   XSS va redirect allowlist
   Payment callbackni server-side tasdiqlash
1. AI arxitekturasi
   6.1. Asosiy qoida
   AI har bir so‘rovga chaqirilmasin. Avval deterministic qoidalar, FAQ, qidiruv, intent router va
   cache ishlasin; faqat murakkab yoki generativ vazifada model ishlatilsin. Bu token xarajatini
   ham, javob vaqtini ham kamaytiradi.
   6.2. AI qatlamlari
1. Rule/FAQ layer: 0 token
1. Intent router: kichik model yoki klassifikator
1. Tool execution: database/API operatsiyalari
1. Response formatter: templated lokal javob
1. LLM fallback: murakkab savol, mahsulot tavsiyasi, marketing kontent
1. Human handoff: operatorga eskalatsiya
   6.3. Tavsiya etilgan provayder strategiyasi
   Bir provayderga qattiq bog‘lanib qolmaslik uchun adapter qatlam yoziladi:
   Primary text/reasoning: OpenAI’ning kichik/tejamkor modeli yoki ekvivalent model
   Fallback text: boshqa provayderdagi arzon va tez model
   Embeddings: multilingual embedding provider
   Image generation: OpenAI image API yoki boshqa tijoriy image API
   Image moderation: provider moderation + server rules
   Speech-to-text: browser Web Speech API MVP; productionda server-side speech provider
   Model nomi va narxi tez o‘zgaradi; konfiguratsiya AI_PROVIDER, AI_TEXT_MODEL_FAST,
   AI_TEXT_MODEL_QUALITY, AI_IMAGE_MODEL environment variable orqali boshqarilishi shart.
   OpenAI narxlari va limitlari doimiy yangilanadi, shuning uchun productiondan avval rasmiy
   pricing sahifasi tekshiriladi. Batch API mavjud bo‘lsa, non-real-time ishlar uchun ishlatiladi.6.4. AI xizmatlari
   Xizmat
   Input
   OutputToken nazorati
   Product copywriterMahsulot atributlarinom, tavsif, SEO, tagJSON, max 400 output token
   Poster generatormahsulot rasmi + briefbanner/posterPro kredit, moderation
   Translation assistantsource textUZ/RU/ENcache by content hash
   Chatbotuser message + minimal contexttext + tool actionintent-first, RAG, cache
   Seller copilotsales/order datainsight/actiondaily batch report
   Search query parsernatural languagefilter JSONmax 100 token
   Review summarizerreviewsqisqa insightasync batch
1. AI dizayn generatori
   7.1. Pro tariflar
   TarifNarx modeli
   AI posterAI textAR model
   Freebepul
   0–cheklangancheklanganyo‘q
   Prooylik + kreditoylik kredityuqori limitcheklangan
   Businessoylikko‘p kreditko‘p tilli paketko‘proq
   Ranking imtiyozi
   yo‘q
   sifat signali
   dashboard/reklama
   Muhim: Pro mahsulotni avtomatik birinchi o‘ringa chiqarish adolatsiz va ishonchni
   kamaytirishi mumkin. “Sponsored” natijalar albatta Reklama deb belgilanishi, organik ranking
   esa sifat, mavjud stock, narx, reyting, yetkazish va relevancelarga asoslanishi kerak.
   7.2. Dizayn oqimi
1. Seller mahsulotni tanlaydi.
1. Brief beradi: aksiya, narx, maqsad platforma, til, format.
1. Tizim brend ranglari, logo, mahsulot rasmi va qonuniy cheklovlarni oladi.
1. Prompt builder qisqa structured prompt yaratadi.
1. Image provider 1–3 variant yaratadi.
1. Moderation va text overlay tekshiruvi bajariladi.
1. Seller edit qiladi: narx, CTA, rang, format.
1. Natija media storagega saqlanadi.
1. Instagram/Telegram uchun eksport yoki scheduling taklif qilinadi.7.3. Prompt shabloni
   Create a clean commercial poster for an Uzbek local e-commerce marketplace.
   Product: {product_name}.
   Product category: {category}.
   Brand colors: {brand_colors}.
   Offer: {price} UZS, {discount}% discount.
   Audience: {audience}.
   Layout: product hero centered, clean space for Uzbek headline, mobile-first 1080x1350
   Style: photorealistic, premium, minimal, high contrast, no illegible text, no waterma
   Do not invent claims, certifications, ingredients, or prices.
   7.4. AI dizayn uchun model maydonlari
   class AIGeneration(models.Model):
   STATUS = [
   ('queued', 'Queued'), ('processing', 'Processing'),
   ('completed', 'Completed'), ('failed', 'Failed'), ('rejected', 'Rejected'),
   ]
   shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE)
   product = models.ForeignKey('products.Product', null=True, blank=True, on_delete=
   kind = models.CharField(max_length=30) # poster, copy, translation, ar
   input_payload = models.JSONField(default=dict)
   output_payload = models.JSONField(default=dict)
   provider = models.CharField(max_length=50)
   model = models.CharField(max_length=100)
   status = models.CharField(max_length=20, choices=STATUS, default='queued')
   input_tokens = models.IntegerField(default=0)
   output_tokens = models.IntegerField(default=0)
   estimated_cost_uzs = models.DecimalField(max_digits=12, decimal_places=2, default
   error_message = models.TextField(blank=True)
   created_at = models.DateTimeField(auto_now_add=True)
   completed_at = models.DateTimeField(null=True, blank=True)
   7.5. Token va xarajat cheklovlari
   Har bir seller uchun kunlik va oylik kredit.
   Har so‘rovda max input/output token.
   Cache key: hash(product_id + locale + template + inputs).
   Bir xil poster request qayta yuborilsa cache preview qaytariladi.
   Rasm generatsiyasi async Celery task orqali.
   Failed task uchun exponential backoff va maximum retry.
   Admin dashboardda provider, model, token, UZS xarajat ko‘rinsin.8. AI chatbot va agent
   8.1. Chatbot vazifalari
   Xaridor:
   “5 ming so‘mgacha non top” kabi tabiiy til qidiruvi
   Mahsulot taqqoslash
   Savatga qo‘shish (tasdiq bilan)
   Buyurtma statusi
   Yetkazish narxi va ETA
   Promo/bonus izlash
   Qayta buyurtma
   Operatorga ulash
   Seller:
   “Bugun nechta buyurtma bo‘ldi?”
   “Sut mahsulotlariga 10% aksiya yarat”
   “Mahsulot tavsifini rus tiliga tarjima qil”
   “Poster yarat”
   Courier:
   Bugungi topshiriqlar
   Marshrutni ochish
   Statusni yangilash
   Admin:
   KPI so‘rash
   Moderatsiya queue ko‘rish
   Hisobot eksportiga so‘rov
   8.2. Agent xavfsizlik qoidasi
   Chatbot ilovani “to‘liq boshqarishi” mumkin, ammo har qanday state-changing action uchun
   quyidagi tartib majburiy:
1. User intent aniqlanadi.
1. Role va permission tekshiriladi.
1. Tool faqat allowlistdan tanlanadi.
1. Action preview ko‘rsatiladi.
1. Foydalanuvchi explicit confirm qiladi.6. Idempotency key bilan amal bajariladi.
1. Audit log yoziladi.
   Misollar:
   Savatga qo‘shish: tasdiqlash talab qilinmaydi yoki settingga bog‘liq.
   Buyurtma yaratish: manzil, summa, to‘lov usuli tasdiqlanadi.
   Mahsulot narxini o‘zgartirish: seller confirm qiladi.
   Refund, payout, delete: qat’iy permission + confirm + audit.
   8.3. Tool schema namunasi
   {
   }
   "name": "search_products",
   "description": "Katalogdan mahsulot qidiradi",
   "parameters": {
   "type": "object",
   "properties": {
   "query": {"type": "string"},
   "category_id": {"type": "integer"},
   "max_price": {"type": "integer"},
   "latitude": {"type": "number"},
   "longitude": {"type": "number"},
   "language": {"type": "string", "enum": ["uz", "ru", "en"]}
   },
   "required": ["query", "language"]
   }
   8.4. Intentlar
   product_search
   product_details
   add_to_cart
   cart_view
   checkout_start
   order_tracking
   repeat_order
   payment_help
   delivery_help
   promo_help
   review_create
   seller_product_create
   seller_product_update
   seller_ai_poster
   seller_analytics
   courier_tasks
   operator_handoff
   general_faq8.5. RAG va knowledge base
   FAQ, delivery policy, refund policy, seller guide va category information markdown
   hujjatlardan indexlanadi.
   Har til uchun alohida yoki til-aware chunk metadata.
   Qidiruv: avval keyword/BM25, keyin embedding hybrid search.
   RAG javobi manbaga bog‘lanadi; noma’lum ma’lumot uydirilmaydi.
   Mahsulot narxi/stock hech qachon RAG’dan emas, to‘g‘ridan-to‘g‘ri DB/API’dan olinadi.
   8.6. Chat session ma’lumoti
   {
   }
   "session_id": "uuid",
   "user_id": 123,
   "locale": "uz",
   "role": "customer",
   "last_intent": "product_search",
   "cart_id": 45,
   "selected_shop_id": 10,
   "recent_product_ids": [1, 2, 3],
   "summary": "User seeks bread under 5000 UZS near location.",
   "updated_at": "ISO-8601"
   Har 8–12 xabardan keyin suhbat summaryga siqiladi. To‘liq chat tarixi ehtiyoj bo‘lsa DBda
   saqlanadi, ammo modelga faqat oxirgi muhim context yuboriladi.
1. Qidiruv va ranking
   9.1. Organik ranking
   Qidiruv natijasi quyidagilar bilan hisoblanadi:
   Query relevance
   Stock availability
   Narx raqobatbardoshligi
   Reyting va verified review
   Buyurtma bajarish sifati
   Yetkazish ETA va masofa
   Mahsulot kontenti sifati: rasm, tavsif, atribut, video/3D
   Seller cancellation rate
   Freshness va aksiya9.2. Sponsored natijalar
   Natija tepasida maksimum 1–3 “Reklama” belgili kartalar.
   Reklama organik natijadan vizual ajratiladi.
   Past rating, stock yo‘q yoki SLA yomon seller reklama qilolmaydi.
   Click/impression/conversion va budjet tracking bo‘ladi.
   9.3. Feature scoring namunasi
   score = (
   relevance _ 0.35 +
   availability _ 0.15 +
   service_quality _ 0.15 +
   rating_quality _ 0.10 +
   delivery_score _ 0.10 +
   content_quality _ 0.10 +
   promotion_score \* 0.05
   )
   Bu formula A/B test bilan o‘zgartiriladi. Pro bo‘lish kontent vositasi va reklama paketini beradi,
   lekin organik qidiruvni yashirin manipulyatsiya qilmaydi.
1. AR/3D tizimi
   10.1. Qaysi kategoriya uchun
   AR hamma mahsulotga bir xil foyda bermaydi. Birinchi navbatda:
   Mebel: stol, stul, shkaf
   Uy jihozlari
   Kiyim/aksessuar: avval 3D preview, keyin virtual try-on
   Tort, pitsa va premium ovqat: 3D showcase
   Elektronika: o‘lchamni ko‘rsatish
   Sovg‘a va dekor
   Meva, oddiy paketli mahsulot va kundalik FMCG uchun ko‘pincha sifatli foto/video, aniq
   og‘irlik va real review AR’dan foydaliroq bo‘ladi.
   10.2. Pipeline
1. Seller 40–120 ta foto yoki 360 video yuklaydi.
1. Upload validation: format, blur, minimum burchak, fon.
1. Photogrammetry/3D provider job yaratiladi.
1. Background worker job statusini polling/webhook bilan kuzatadi.5. GLB va iOS uchun USDZ asset olinadi.
1. Blender/mesh pipeline bilan polygon, texture va scale optimizatsiya qilinadi.
1. Physical dimensions metadata orqali metrga mos scale o‘rnatiladi.
1. CDNga joylanadi.
1. AR URL va QR code yaratiladi.
1. QA: Android Chrome, Android Scene Viewer, iOS Quick Look, desktop 3D preview.
   10.3. Formatlar
   .glb: web va Android uchun asosiy format
   .usdz: iOS Quick Look uchun
   Texture: WebP/KTX2 imkon bo‘lsa
   Mesh compression: Draco yoki Meshopt
   LOD: low/medium/high
   <model-viewer> web sahifada interaktiv 3D ko‘rsatish va WebXR, Android Scene Viewer hamda
   iOS Quick Look rejimlariga fallback berishi mumkin. Rasmiy dokumentatsiya WebXR, Scene
   Viewer va Quick Look rejimlarini qo‘llab-quvvatlashini ko‘rsatadi. [web:31][web:39]
   10.4. Product model kengaytmasi
   class Product(models.Model):

# existing fields...

width_mm = models.PositiveIntegerField(null=True, blank=True)
height_mm = models.PositiveIntegerField(null=True, blank=True)
depth_mm = models.PositiveIntegerField(null=True, blank=True)
weight_g = models.PositiveIntegerField(null=True, blank=True)
volume_ml = models.PositiveIntegerField(null=True, blank=True)
glb_file = models.FileField(upload_to='ar/glb/', null=True, blank=True)
usdz_file = models.FileField(upload_to='ar/usdz/', null=True, blank=True)
ar_qr_code = models.ImageField(upload_to='ar/qr/', null=True, blank=True)
ar_status = models.CharField(max_length=20, default='none')
ar_scale_verified = models.BooleanField(default=False)
10.5. AR sahifasi
<model-viewer
src="{{ product.glb_file.url }}"
ios-src="{{ product.usdz_file.url }}"
alt="{{ product.name }} 3D modeli"
ar
ar-modes="webxr scene-viewer quick-look"
ar-scale="fixed"
camera-controls
auto-rotate
shadow-intensity="1"><button slot="ar-button" class="btn btn-primary">AR da ko‘rish</button>
</model-viewer>
10.6. AR sifat qoidalari
“1:1” deb yozishdan avval haqiqiy o‘lcham verifikatsiya qilinadi.
Food mahsulotlarda hajm ko‘rsatkichi taxminiy ekanini bildirish mumkin.
Foydalanuvchi qurilmasi AR’ni qo‘llamasa 3D viewer fallback ishlaydi.
3D model 10–20 MBdan oshmasligi, mobil tarmoqqa mos lazy-load bo‘lishi kerak. 11. To‘lov tizimi
11.1. Hozir API kalitlari yo‘q holatda tayyorgarlik
API kalitsiz ham to‘lov modulini “provider adapter” arxitekturasi bilan to‘liq tayyorlab qo‘yish
mumkin. Test/mock provider ishlatiladi; real kalit kelganda environment variable orqali
provider yoqiladi.
11.2. Provider interface
class PaymentProvider:
code: str
def create_payment(self, order, return_url, callback_url) -> dict:
raise NotImplementedError
def verify_callback(self, request) -> dict:
raise NotImplementedError
def get_status(self, transaction_id: str) -> dict:
raise NotImplementedError
def refund(self, payment, amount) -> dict:
raise NotImplementedError
Implementatsiyalar:
payments/providers/mock.py
payments/providers/click.py
payments/providers/payme.py
payments/providers/uzum.py
payments/providers/cash.py11.3. Payment modeli
class Payment(models.Model):
STATUS = [
('created', 'Created'), ('pending', 'Pending'), ('paid', 'Paid'),
('failed', 'Failed'), ('cancelled', 'Cancelled'), ('refunded', 'Refunded'),
('partially_refunded', 'Partially Refunded'),
]
order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name=
provider = models.CharField(max_length=30)
status = models.CharField(max_length=30, choices=STATUS, default='created')
amount = models.DecimalField(max_digits=14, decimal_places=2)
currency = models.CharField(max_length=3, default='UZS')
merchant_transaction_id = models.CharField(max_length=100, unique=True)
provider_transaction_id = models.CharField(max_length=100, blank=True)
payment_url = models.URLField(blank=True)
raw_request = models.JSONField(default=dict)
raw_response = models.JSONField(default=dict)
paid_at = models.DateTimeField(null=True, blank=True)
created_at = models.DateTimeField(auto_now_add=True)
11.4. Payment flow

1. Order serverda yaratiladi: payment_status=pending.
2. Tizim idempotent merchant_transaction_id yaratadi.
3. Payment provider invoice/link yaratadi.
4. User checkout sahifasiga redirect qilinadi.
5. Provider callback yuboradi.
6. Server signature/authenticationni tekshiradi.
7. Transaction amount va orderni tekshiradi.
8. Callbackni idempotent qayta ishlaydi.
9. Payment paid bo‘lsa order confirmed qilinadi.
10. Seller, customer, courier uchun xabar yuboriladi.
11. Reconciliation job provider statusini periodik tekshiradi.
    11.5. Click integratsiyasi
    CLICK merchant dokumentatsiyasida merchant API endpointi va invoice yaratish endpointi
    ko‘rsatilgan; real request formati, signature va callback qoidalari aynan merchant
    kabineti/dokumentatsiyasidagi amaldagi versiyaga mos yozilishi kerak. [web:32][web:37]11.6. Payme integratsiyasi
    Merchant account ochiladi.
    Test credentials olinadi.
    JSON-RPC metodlari provider hujjatiga mos yoziladi.
    CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction,
    CheckTransaction oqimlari adapterda ajratiladi.
    account.order_id bo‘yicha order topiladi.
    Miqdor tiyin/so‘m birligi aniq test qilinadi.
    11.7. Xavfsizlik
    API key hech qachon frontendga chiqmaydi.
    Payment callback IP/signature verification.
    merchant_transaction_id unique.
    Callback replayga qarshi idempotency.
    Summa faqat serverdagi orderdan olinadi.
    Karta ma’lumoti platformada saqlanmaydi.
    Har payment uchun audit log.
    Refund faqat role/approval orqali.
    11.8. Mock provider
    class MockPaymentProvider(PaymentProvider):
    code = 'mock'
    def create_payment(self, order, return_url, callback_url):
    return {
    'provider_transaction_id': f'MOCK-{order.order_number}',
    'payment_url': f'/payment/mock/{order.id}/',
    'status': 'pending',
    }
    Bu orqali UI, order state machine, webhook, success/failure va testlar API kalitsiz tugallanadi.
12. Yetkazib berish: Yandex yoki o‘z kuryeri?
    12.1. Tavsiya: gibrid model
    Boshlanishda faqat Yandexga tayanish tavsiya etilmaydi. Eng yaxshi model:
    O‘z kuryeri: markaziy zonalar, takroriy buyurtmalar, brend nazorati, arzon delivery
    Hamkor/agregator: pik soat, uzoq zona, kuryer yetishmovchiligi, shaharlararo jo‘natmaPickup: do‘kondan olib ketish, delivery xarajatini kamaytirish
    Yandex Go O‘zbekistonda shaharlararo jo‘natma xizmatlarini ham kengaytirganini e’lon qilgan,
    ammo sizning hududingizdagi real API/coverage, tarif va SLA’ni tijoriy vakil bilan tekshirish
    zarur. [web:14]
    12.2. Nega gibrid model
    Holat
    O‘z kuryeri
    Agregator/Yandex
    Tanlov
    0–3 km, buyurtma ko‘pJuda foydaliNisbatan qimmatO‘z kuryeri
    Pik soatCheklangan quvvatTez scaleAgregator
    5+ kmXarajat oshadiNarx aniqroq bo‘lishi mumkinDinamik tanlov
    Brend tajribasiYuqori nazoratPast nazoratO‘z kuryeri
    Yangi shaharKuryer yollash qiyinTez ishga tushishAgregator
    12.3. Delivery price modeli
    base_fee + (distance_km × per_km_fee) + peak_fee + weight_fee - free_delivery_discoun
    Misol policy:
    0–2 km: 5 000 so‘m
    2–5 km: 7 000 so‘m
    5–8 km: 10 000 so‘m
    Minimal buyurtma: kategoriya yoki shopga bog‘liq
    Free delivery threshold: do‘kon marjasi bo‘yicha
    Pik vaqtda aniq surcharge ko‘rsatilsin
    12.4. Dispatch algoritmi
13. Order ready bo‘lganda courier pool olinadi.
14. Online, mos zona, yuk sig‘imi, hozirgi masofa va acceptance rate score qilinadi.
15. Eng yaxshi 1–3 kuryerga offer yuboriladi.
16. Timeoutdan so‘ng keyingi kuryerga o‘tadi.
17. Manual dispatcher override qila oladi.
18. ETA real GPSga qarab qayta hisoblanadi.12.5. Delivery KPI
    Acceptance rate
    Pickup on-time rate
    Delivery on-time rate
    Avg delivery minutes
    Cancellation rate
    Failed delivery rate
    Cost per delivery
    Courier earnings/hour
    NPS/CSAT
19. Xarita va navigatsiya
    13.1. Mavjud stack
    Leaflet + OpenStreetMap + OSRM MVP uchun mos. Productionda tile usage policy, rate limits va
    geocoding provider alohida ko‘riladi.
    13.2. Funksiyalar
    User geolocation consent
    Shop markers
    Delivery zone polygons
    Courier realtime marker
    Order route
    Pickup point
    Address autocomplete/geocoding
    Saved addresses: uy, ish, boshqa
    Entrance/floor/apartment va delivery note
    13.3. Lokatsiya maxfiyligi
    Faqat delivery davomida kuryer lokatsiyasi ko‘rsatiladi.
    Customer exact koordinatasi faqat buyurtmaga tayinlangan kuryerga beriladi.
    Lokatsiya retention muddati belgilanadi.
    GPS update interval adaptive: harakatda 10–20 s, fonda kamroq.14. Ko‘p tillilik: UZ/RU/EN
    14.1. Arxitektura
    UI: Django i18n yoki markazlashgan translation catalog
    API: Accept-Language hamda lang parametri
    DB: mahsulot nomi/tavsifining tarjima JSON maydonlari yoki translation model
    AI: user localega mos output, keyin moderation
    SEO: /uz/, /ru/, /en/ yoki hreflang strategy
    14.2. Translation model
    class ProductTranslation(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related
    language = models.CharField(max_length=5, choices=[('uz', 'Uzbek'), ('ru', 'Russi
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)
    class Meta:
    unique_together = ('product', 'language')
    14.3. Sifat qoidalari
    Narx, o‘lchov va birliklar tarjimada buzilmasin.
    “dona”, “kg”, “litr” locale formatga mos bo‘lsin.
    Seller kiritgan matn AI tarjimasidan oldin moderationdan o‘tsin.
    Muhim yuridik/to‘lov matnlari inson tomonidan tasdiqlangan translationsdan chiqsin.
20. Ma’lumotlar modeli kengaytmasi
    15.1. Shop pro va quality
    class Shop(models.Model):

# existing fields...

plan = models.CharField(max_length=20, default='free')
plan_expires_at = models.DateTimeField(null=True, blank=True)
commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=8.0
acceptance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100
cancellation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0
avg_preparation_minutes = models.PositiveIntegerField(default=30)
is_verified = models.BooleanField(default=False)15.2. Product sifat
class Product(models.Model):

# existing fields...

sku = models.CharField(max_length=80, blank=True)
barcode = models.CharField(max_length=80, blank=True)
description = models.TextField(blank=True)
ingredients = models.TextField(blank=True)
nutrition = models.JSONField(default=dict, blank=True)
is_active = models.BooleanField(default=True)
is_sponsored = models.BooleanField(default=False)
sponsored_until = models.DateTimeField(null=True, blank=True)
total_sales = models.PositiveIntegerField(default=0)
view_count = models.PositiveIntegerField(default=0)
cart_add_count = models.PositiveIntegerField(default=0)
15.3. Delivery model
class DeliveryTask(models.Model):
STATUS = [
('unassigned', 'Unassigned'), ('offered', 'Offered'), ('accepted', 'Accepted
('picked_up', 'Picked up'), ('delivered', 'Delivered'), ('failed', 'Failed')
]
order = models.OneToOneField('orders.Order', on_delete=models.CASCADE)
courier = models.ForeignKey('couriers.Courier', null=True, blank=True, on_delete=
status = models.CharField(max_length=20, choices=STATUS, default='unassigned')
pickup_latitude = models.FloatField()
pickup_longitude = models.FloatField()
dropoff_latitude = models.FloatField()
dropoff_longitude = models.FloatField()
estimated_distance_m = models.PositiveIntegerField(default=0)
estimated_duration_s = models.PositiveIntegerField(default=0)
assigned_at = models.DateTimeField(null=True, blank=True)
picked_up_at = models.DateTimeField(null=True, blank=True)
delivered_at = models.DateTimeField(null=True, blank=True) 16. API dizayni
16.1. Auth
POST /api/v1/auth/request-otp/
POST /api/v1/auth/verify-otp/
POST /api/v1/auth/refresh/
POST /api/v1/auth/logout/
GET /api/v1/me/
PATCH /api/v1/me/16.2. Catalog
GET
GET
GET
GET
GET
GET
/api/v1/products/
/api/v1/products/{slug}/
/api/v1/products/{id}/ar/
/api/v1/categories/
/api/v1/shops/
/api/v1/search/?q=&lat=&lng=&lang=
16.3. Cart va order
GET
/api/v1/cart/
POST /api/v1/cart/items/
PATCH /api/v1/cart/items/{id}/
DELETE /api/v1/cart/items/{id}/
POST /api/v1/checkout/quote/
POST /api/v1/orders/
GET
/api/v1/orders/
GET
/api/v1/orders/{id}/tracking/
POST /api/v1/orders/{id}/repeat/
16.4. Payment
POST /api/v1/payments/create/
POST /api/v1/payments/click/callback/
POST /api/v1/payments/payme/callback/
GET /api/v1/payments/{id}/status/
POST /api/v1/payments/{id}/refund-request/
16.5. AI
POST /api/v1/ai/chat/messages/
POST /api/v1/ai/design/generations/
GET /api/v1/ai/design/generations/{id}/
POST /api/v1/ai/products/{id}/copy/
POST /api/v1/ai/products/{id}/translate/
16.6. AR
POST /api/v1/seller/products/{id}/ar/capture/
GET /api/v1/seller/products/{id}/ar/jobs/{job_id}/
GET /ar/{product_id}/
GET /api/v1/products/{id}/ar/qr/17. Background jobs
Celery queues:
critical: payment callbacks/reconciliation
high: order notifications/courier dispatch
normal: AI chat async analytics, image optimization
low: AI poster, translations, AR/3D conversion, reports
Vazifalar:
send_order_notifications
assign_courier
recalculate_eta
sync_payment_status
generate_ai_poster
generate_product_copy
translate_product
start_3d_capture
poll_3d_job
generate_ar_qr
send_crm_campaign
daily_seller_report
cleanup_expired_carts 18. Xavfsizlik va compliance
18.1. Secretlar
DJANGO_SECRET_KEY=
DATABASE_URL=
REDIS_URL=
TELEGRAM_BOT_TOKEN=
CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_API_KEY=
PAYME_MERCHANT_ID=
PAYME_KEY=
AI_PROVIDER=
AI_API_KEY=
S3_ACCESS_KEY=
S3_SECRET_KEY=
.env gitga kirmaydi..env.example faqat key nomlari bilan bo‘ladi.
Oldin oshkor bo‘lgan Telegram token rotatsiya qilinadi.
Production key rotation jadvali bo‘ladi.
18.2. Web security
HTTPS only
CSP, HSTS, secure cookies
CSRF protection
Rate limiting: OTP, login, chat, checkout
Input validation va file upload scan
RBAC va object-level permissions
Audit log: payment, refund, role, price, stock, order status
Backup restore drills
18.3. AI security
Prompt injectionga qarshi tool allowlist
Chatbot system promptda secret/DB dump bermaydi
PII modelga minimal yuboriladi
Kredit card data modelga yuborilmaydi
User-generated content moderation
AI outputni actionable commandga aylantirishdan avval server validation 19. Monitoring va analitika
19.1. Texnik monitoring
Error rate, latency, 5xx
Queue depth va failed jobs
DB slow query
Payment callback failures
AI cost per feature/shop
CDN bandwidth
Uptime checks19.2. Business KPI
GMV
Net revenue/commission
Orders/day
Conversion rate
Average order value
Repeat purchase rate
Delivery SLA
Cancellation/refund
Customer acquisition cost
LTV/CAC
Seller active rate
AI poster to conversion uplift
AR view to add-to-cart uplift 20. UI/UX qoidalari
Mobile-first; Guliston foydalanuvchilarining internet tezligini hisobga oling.
First content < 2.5 s maqsad.
Rasm: WebP/AVIF, responsive sizes, lazy load.
Skeleton loading.
PWA install banner.
Accessibility: katta touch target, kontrast, form validation.
Checkout 3 ekrandan oshmasin.
Har buyurtmada aniq: summa, delivery, ETA, shop, payment status.
“AI generated” dizayn sellerga ko‘rsatilishi va edit qilinishi kerak. 21. Flutter ilova
21.1. Modullar
Auth va OTP
Home/catalog/search
Product + AR deep link
Cart/checkout/payment WebView
Map/order trackingChatbot
Push notification
Offline catalog/cache
In-app browser allowlist
21.2. Tavsiya stack
Flutter
Dio
Riverpod yoki Bloc
flutter_secure_storage
Firebase Messaging
flutter_map yoki native map SDK
WebView/InAppWebView payment uchun
model-viewer WebView yoki platform-native AR deep link
Hive/Isar offline cache
21.3. Deep links
guliston://product/{slug}
guliston://order/{id}
guliston://ar/{id}
guliston://payment/result/{id}
https://domain.uz/ar/{id} 22. Delivery bosqichlari
Phase 0 — Security and foundation (1–2 hafta)
Telegram token rotate
Env migration
PostgreSQL/Redis/Celery
Docker, CI/CD, backup
Permission audit
Payment provider interface + mock provider
Phase 1 — Commerce reliability (3–5 hafta)
Order state machine
Stock reservation
Payment mock end-to-end
Courier dispatch basicDelivery zones/fees
Production monitoring
Checkout UX
Phase 2 — Payment and logistics (3–4 hafta)
Click sandbox/production integration
Payme sandbox/production integration
Webhook verification/reconciliation
2–3 in-house courier pilot
Aggregator/Yandex feasibility and adapter
OTP delivery confirmation
Phase 3 — AI chatbot MVP (3–4 hafta)
FAQ + intent router
Product search tool
Cart/order/tracking tools
UZ/RU/EN
Chat history and feedback
Operator handoff
Cost dashboard
Phase 4 — Seller AI (3–4 hafta)
AI product copy
Translation
Poster MVP
Pro plan credits
Moderation
Analytics
Phase 5 — AR/3D MVP (3–5 hafta)
Manual GLB/USDZ upload
Model-viewer product page
QR code
10 premium SKU pilot
3D capture provider integration
Size verification workflowPhase 6 — Flutter and scale (6–10 hafta)
Customer app MVP
Courier app/PWA
Push
In-app browser
Offline cache
Performance test 23. 50–100 mln so‘m budjet strategiyasi
50–100 mln so‘m bilan hamma funksiyani bir vaqtda ideal qilish real emas. Eng yaxshi yo‘l —
asosiy savdo va yetkazishni daromad beradigan darajaga olib chiqib, AI/AR’ni pilot sifatida
qo‘shish.
23.1. 50 mln so‘m ssenariy
Yo‘nalish
Taxminiy budjet
Izoh
Core backend/production hardening10–15 mln
mavjud kodni ishonchli qilish
Payment module + test/sandbox5–8 mlnAPI kalit kutiladi
Courier/delivery MVP8–12 mln1–2 kuryer/pilot
AI chatbot MVP6–10 mlnFAQ + tools, minimal UI
AI seller copy/poster pilot4–7 mlnkreditli limit
Marketing/launch8–12 mlnlokal fokus
Infra/API reserve3–5 mlnserver, SMS, AI, storage
Bu ssenariyda AR faqat manual 3D upload va 5–10 SKU demo bo‘ladi.
23.2. 100 mln so‘m ssenariy
Yo‘nalish
Taxminiy budjet
Izoh
Production core va QA15–20 mlntest/monitoring/security
Payment + finance operations7–10 mlnprovider integration
Logistics pilot15–25 mln2–3 kuryer, transport/operatsiya
AI chatbot + seller AI15–20 mlnmultilingual + analytics
AR/3D pilot8–15 mlncapture, QA, 20–50 SKU
Flutter MVP15–25 mlncustomer app first
Marketing + reserve10–15 mlnlaunch/experiments23.3. Budjetning asosiy qoidasi
Avval GMV, repeat rate va delivery SLA’ni isbotlang.
Marketing xarajatini tracking links, promo code va cohort bilan o‘lchang.
AI va AR uchun kredit/limit bo‘lsin; “cheksiz AI” modeli zarar keltiradi.
Yandexga ulanishdan oldin o‘z delivery cost/order va SLA’ni o‘lchang. 24. 90 kunlik ish rejasi
1–30 kun
Security cleanup va token rotation
PostgreSQL/Redis/Celery
Payment abstraction + mock checkout
Delivery pricing/zones
Courier dashboard improvements
Seller permissions
Analytics event schema
31–60 kun
Click/Payme onboarding, test integration
Order/payment reconciliation
2 kuryerli lokal pilot
AI chatbot FAQ + product search
AI product copy/translation
CRM: abandoned cart, reorder
61–90 kun
AI poster Pro beta
Model-viewer va QR AR pilot
10–20 mahsulot 3D demo
Referral/loyalty
A/B tests
Flutter MVP scope freeze/start25. Test rejasi
25.1. Payment tests
Success callback
Failed callback
Duplicate callback
Wrong amount
Invalid signature
Timeout
Refund
Concurrent checkout
25.2. Delivery tests
Zone ichida/tashqarisida address
Courier accept/reject/timeout
GPS unavailable
Order cancellation before/after pickup
OTP mismatch
25.3. AI tests
Uzbek/Russian/English intent
Prompt injection
Tool permission boundary
AI hallucinated price
Cache hit/miss
Credit limit
Image moderation
25.4. AR tests
Android Chrome WebXR
Android fallback
iOS Safari Quick Look
Unsupported browser fallback
Large model slow network
Correct physical scale26. Qabul mezonlari
Commerce
Checkout 99% successful test flow
Payment callback idempotent
Stock oversell yo‘q
Order status history saqlanadi
Delivery
Courier assignment 60 soniyadan kam
Customer tracking ishlaydi
Delivery fee quote server-side aniqlanadi
AI
FAQ savollarining kamida 70% AI chaqirmasdan javob oladi
Product search natural language orqali ishlaydi
Har tool action permission/audit bilan
Monthly AI budget limit mavjud
AR
Kamida 10 SKU uchun GLB preview
Kamida Android/iOS fallback test
QR URL ishlaydi
O‘lcham metadata ko‘rsatiladi
Language
UZ/RU/EN UI 100% asosiy flowlarda
Checkout va payment yuridik matnlari tasdiqlangan tarjimada
Chatbot barcha 3 tilda ishlaydi 27. Dasturchi uchun final prompt
Quyidagi promptni AI coding agent yoki dasturchi jamoaga bering:
Sen Online Store Guliston loyihasining senior Django/DRF, Flutter, DevOps va AI integ
Muhim qoidalar:

1. Mavjud ishlaydigan customer/admin/courier/map/telegram funksiyalarini buzma.2. Har o‘zgarishdan oldin kodbazani tekshir, keyin kichik commitga bo‘lingan implemen
2. SQLite MVP bo‘lsa ham production uchun PostgreSQL, Redis, Celery, S3 storage, Dock
3. Hech qachon secret, bot token, API keyni kodga yozma; `.env.example` yarat, `.env`
4. Oldin oshkor qilingan Telegram tokenni unsafe deb hisobla; yangi token berilmagunc
5. To‘lov API kalitlari hali yo‘q. PaymentProvider adapter, MockPaymentProvider, Orde
6. Payment callbackda signature, amount, order, replay/idempotency tekshiruvini majbu
7. AI chatbot tool-based bo‘lsin: product search, cart, order tracking, seller analyt
8. Chatbot state-changing actionlarida preview + explicit confirmation + role permiss
9. UZ/RU/EN barcha customer, seller, courier va chatbot flowlarida ishlasin.
10. AI xarajatlarini kamaytir: FAQ/rule layer, cache, intent routing, qisqa JSON outp
11. AI poster funksiyasini background Celery jobda, moderatsiya va seller credit bila
12. AR’ni avval manual GLB/USDZ upload + model-viewer + QR page bilan qil. Keyin 3D c
13. Qidiruv ranking organik quality/relevance/stock/SLA/distancega asoslanadi. Sponso
14. Logistics gibrid bo‘lsin: own courier dispatch asosiy, external/Yandex adapter fa
15. Har yangi endpoint uchun serializer validation, permissions, tests va OpenAPI doc
16. Har feature yakunida migration, unit test, integration test, qisqa changelog va r
17. Mobile-first responsive templatesni saqla; Flutter API v1 contractni stable qil.
    Implementatsiya tartibi:
    A. Security/infra: env, PostgreSQL config, Redis/Celery, Docker, logs, backups.
    B. Commerce reliability: inventory, order state machine, payment abstraction/mock, au
    C. Delivery: zones, quote, courier assignment, tracking, OTP proof.
    D. Click/Payme adapters: sandbox-ready, webhook verification, reconciliation.
    E. AI chatbot MVP: FAQ, multilingual intent, tools, human handoff, cost control.
    F. Seller AI: product copy, translation, poster generation, Pro credits.
    G. AR MVP: GLB/USDZ, model-viewer, QR, dimensions, job model.
    H. Analytics/CRM: events, referral, loyalty, campaigns.
    I. Flutter API: JWT/OTP, catalog/cart/order/payment/tracking/chat endpoints.
    Har bosqichda avval reja, keyin faylma-fayl o‘zgarishlar, so‘ng test buyruqlari va ex
18. Yakuniy prioritet
19. Xavfsizlik: tokenlar, env, backup, permission.
20. Pul oqimi: checkout, payment adapter, order state machine.
21. Operatsiya: yetkazish, kuryer, SLA, support.
22. O‘sish: CRM, referral, reviews, katalog sifati.
23. AI: avval chatbot/SEO/copy; keyin poster.
24. AR: avval premium kategoriyalarda pilot, keyin scale.
25. Mobil ilova: API stable bo‘lgandan keyin Flutter.
    Bu yo‘l bilan loyiha shunchaki funksiyalar yig‘indisi emas, balki ishonchli va iqtisodiy jihatdan
    boshqariladigan lokal e-commerce ekotizimiga aylanadi.
