# TZ — AI Chatbot (Ideal, To'liq)

**Loyiha:** Online Store Guliston — Gipermahalliy Marketplace  
**Modul:** AI Yordamchi (chatbot) — `ai/` app + `components/ai_chat.html`  
**Maqsad:** Xaridor, sotuvchi va mehmon uchun 24/7 yordamchi: mahsulot qidirish, buyurtma holati, do'kon ma'lumoti, fallback + real OpenAI.  
**Tillari:** uz / ru / en (to'liq i18n)  
**Versiya:** 2026-08-29 · **Holat:** ishlaydi (fallback), OpenAI kalit bilan ideal — shu TZ bo'yicha

---

## 0. Qisqa Xulosa (30 soniya)
Chatbot — **ikki qavat**: (1) **Fallback** (DB qidiruv + buyurtma _find_order) — kalitsiz ham 80% so'rovni javoblaydi, (2) **OpenAI** (`gpt-4o-mini`, `temperature 0.4`, 500 token) — kalit bo'lsa fallback dan ustun. Har bir xabar `ChatSession` + `ChatMessage` da saqlanadi, `rate_limit 30/60s`, `session_key` localStorage da, til `request.language` (uz/ru/en) orqali avtomatik.

---

## 1. Maqsad va Qamrov

### 1.1 Biznes Maqsad
- Savdo konvertatsiyasini oshirish (mahsulot topish → savat)
- Buyurtma qo'ng'iroqlarini kamaytirish (holatni chatbot aytadi)
- Sotuvchi yuki kam — mijoz polisini o'zi oladi

### 1.2 Foydalanuvchi
- **Xaridor** (mehmon ham) — `/` dan `ai_chat.html` floating tugma orqali
- **Sotuvchi** — o'z do'koni mahsulotini qidirish
- **Admin** — monitoring, tarix ko'rish (kelajak)

### 1.3 Qamrovdan Tashqari (hozir)
- Ovozli kirish, rasm tanish, to'lov qilish — kelajak (2-bosqich).

---

## 2. Funksional Talablar

### 2.1 Majburiy (MVP — hozir ishlaydi)
| # | Funksiya | Trigger | Manba | Namuna |
|---|----------|---------|-------|--------|
| F-01 | Salomlashish | `salom`, `hello`, `привет` | fallback | `uz: Assalomu alaykum...`, `ru: Здравствуйте...` |
| F-02 | Mahsulot qidirish | 3+ harfli so'z, stop-so'zlardan tozalab `Q(name|tags|description__icontains)` | `Product` (is_available) 5 ta | `uz: Topilgan mahsulotlar: • Sut 7 — 29500 so'm` |
| F-03 | Buyurtma holati | `GLS-`, `buyurtma`, `zakaz`, `order`, `заказ` + regex `GLS-[A-Z0-9\-]+` yoki 4+ raqam | `Order` | `uz: Buyurtma #GLS-... Holati: kutilmoqda` (ru/en ham) |
| F-04 | Yordam menyusi | hech biri mos kelmasa | fallback | 3 bandli yordam matni (tilga mos) |
| F-05 | Bo'sh xabar | `""` | validatsiya | `Iltimos, savol yozing.` (3 tilda) |

### 2.2 OpenAI Qavati (kalit bo'lsa)
- `AI_API_KEY` bo'sh → `None` → fallback
- To'ldirilsa: `SYSTEM_PROMPT_UZ/RU/EN` + `history[:10]` + `user_message` → `https://api.openai.com/v1/chat/completions` (`gpt-4o-mini`, `temperature 0.4`, `max_tokens 500`, `timeout 25s`, `urllib.request` stdlib)
- `source: openai` bo'lsa UI da yashil badge (kelajak).

### 2.3 Marketing Triggerlari (ai/marketing_service.py)
- `generate_marketing_post(shop, product, channel=telegram/instagram/facebook)` — short, emoji, narx, CTA
- `generate_mood_message(shop)` — kayfiyat, `generate_upsell(product)` — ham kalit bo'lsa OpenAI, yo'qsa shablon.

### 2.4 Sessiya va Tarix
- `ChatSession(session_key uuid4.hex, user FK nullable)` + `ChatMessage(session, role=user/assistant, content, created_at)` `ai/models.py:4`
- Har POST da `session_key` yoki `X-Session-Key` header → `get_or_create`
- Tarix `history[:10]` OpenAI ga beriladi, `ChatMessage` ga yoziladi.
- Mehmon ham yoziladi (user null) — telemetriya yo'qolmaydi.

---

## 3. Nofunksional

| Ko'rsatkich | Talab |
|-------------|-------|
| **Til** | `request.language` (uz/ru/en) → barcha fallback matn, system prompt, welcome, placeholder, error 3 tilda. UI `document.documentElement.lang` ni yuboradi (`ai_chat.html:46`). |
| **Rate limit** | `backend/ratelimit.py:22` `chat_api 30/60s` IP bo'yicha (`X-Forwarded-For` hisobga). 31-chi → `429 {"retry_after": X}` |
| **Xavfsizlik** | `csrf_exempt` + `rate_limit` + `MAX_MSG_LEN 1000` slice + `escapejs` welcome + `localStorage` session (cookie emas) |
| **Ishlash** | Fallback < 120ms (DB 5 ta), OpenAI < 3s (25s timeout). `select_related('shop')`, `is_available` indeksi. |
| **Ishonchlilik** | OpenAI xato → fallback jim, `source: fallback` — hech qachon 500 emas. |
| **PWA** | Floating `z-50` `bottom-5 right-5`, `backdrop-blur` emas, `Alpine.js` — SPA shart emas. |

---

## 4. Arxitektura

```
[Browser / ai_chat.html] --POST /api/v1/ai/chat/--> [Django chat_api:30]
        |                       |-> LanguageMiddleware (uz/ru/en) -> request.language
        |                       |-> rate_limit 30/60
        |                       |-> _get_session(uuid4) -> ChatSession
        |                       |-> history[:10] -> chat_reply(message, lang)
        |                                                    |-> _call_openai(system_uz/ru/en) -> openai
        |                                                    |-> _fallback_reply(lang) -> DB
        |                       |-> ChatMessage(user/assistant)
        |                       <- JsonResponse {reply, source, session_key}
        |-> localStorage.setItem('ai_session_key')
```

- **Backend:** `ai/ai_service.py:33 _call_openai`, `ai/views.py:31 chat_api`, `ai/models.py:4`, `backend/ratelimit.py`
- **Frontend:** `templates/components/ai_chat.html:47 aiChat()` Alpine, `templates/base.html:102 {% include 'components/ai_chat.html' %}` — barcha sahifada.

---

## 5. Ma'lumot Modeli

| Model | Maydon | Tur | Izoh |
|-------|--------|-----|------|
| `ChatSession` | `session_key` | char 64 unique | uuid4.hex |
|  | `user` | FK AdminUser null | login bo'lsa bog'lanadi |
| `ChatMessage` | `session` | FK ChatSession |  |
|  | `role` | enum user/assistant |  |
|  | `content` | text |  |
|  | `created_at` | datetime | ordering |

Kelajak: `lang`, `source`, `tokens`, `feedback` ustunlari qo'shiladi.

---

## 6. API Kontrakt

### 6.1 `POST /api/v1/ai/chat/` `ai/urls.py:7`
**So'rov:**
```json
{
  "message": "sut qidir",
  "session_key": "abc123",   // ixtiyoriy
  "lang": "ru"               // ixtiyoriy, bo'sh bo'lsa request.language
}
Header: X-Session-Key: abc123 (muqobil)
```
**Javob (200):**
```json
{
  "reply": "Topilgan mahsulotlar:\n• Sut 7 — 29500 so'm (...)",
  "source": "fallback|openai|empty",
  "session_key": "abc123"
}
```
**Xato:**
- `429 {"success": false, "error": "Juda ko'p so'rov...", "retry_after": 42}` — rate limit
- `400` — bo'sh message → `Iltimos, savol yozing.`

### 6.2 `POST /api/v1/ai/marketing/` — shop_owner Pro/Business, `shop.can_use_ai_marketing()` + kredit.

---

## 7. Frontend — `ai_chat.html` TZ

- **Joylashuv:** `fixed bottom-5 right-5 z-50`, yopiqda `w-14 h-14` smart_toy FAB, ochiqda `w-[min(92vw,380px)] h-[min(70vh,560px)] rounded-3xl`
- **Header:** `{{ t.ai_chat_title }}` + `typing ? '{{ t.ai_chat_typing }}' : 'Guliston Market'`
- **Messages:** `whitespace-pre-line`, user `bg-primary text-white rounded-br-md`, assistant `bg-white border rounded-bl-md`
- **Input:** `placeholder="{{ t.ai_chat_placeholder }}"`, `required`, `disabled` typingda
- **JS:** `localStorage.getItem('ai_session_key')`, `document.documentElement.lang || 'uz'` ni `lang` sifatida yuboradi, `session_key` ni saqlaydi, `scrollTop = scrollHeight`
- **i18n:** `welcome`, `placeholder`, `typing`, `error`, `no_reply` barchasi `i18n_tags.py` dan (`ai_chat_title/subtitle/...`)

---

## 8. Xavfsizlik va Cheklovlar

| Tahdid | Yechim |
|--------|--------|
| Flood | `rate_limit 30/60` IP, `MAX_MSG_LEN 1000` slice |
| XSS | `x-text` (Alpine) + `escapejs` welcome, `role` enum |
| CSRF | `csrf_exempt` ataylab (mehmon), lekin `rate_limit` bor |
| Session hijack | `uuid4.hex` 32 char, localStorage, HttpOnly cookie emas — o'g'irlash qiyin |
| Prompt injection | System prompt mahkam, user_message to'g'ridan `user` role sifatida |

---

## 9. Monitoring va Telemetriya

- `ChatMessage` soni = sessiyalar, `source` = openai vs fallback foizi
- Kelajak: `POST /api/v1/ai/feedback/` (👍/👎), `duration`, `tokens`

---

## 10. Sozlash

```env
AI_API_KEY=sk-...               # bo'sh bo'lsa fallback
AI_TEXT_MODEL_FAST=gpt-4o-mini  # yoki gpt-4o
AI_TEXT_MODEL_QUALITY=gpt-4o
```

`.env` da bo'sh bo'lsa hech qanday xato yo'q — `True` fallback.

---

## 11. Ishlash Budjeti

- Fallback < 150ms (DB 5 ta, `select_related`)
- OpenAI < 2.5s (25s timeout, 30s da fallback)
- Widget JS < 8KB (Alpine bilan), CSS 0 (Tailwind bor)

---

## 12. Kelajak (2-bosqich)

- RAG: `Product` + `Shop` vektor qidiruv (embedding `text-embedding-3-small`)
- Tavsiya: `collaborative filtering` + FAQ
- Ovoz: STT/TTS
- Admin panel: sessiya tarixi, qidiruv, o'chirish

---

## 13. Qabul Checklist

```
[ ] POST /api/v1/ai/chat/ uz/ru/en da 3 xil salomlashish qaytadi
[ ] "sut"/"молоко"/"milk" → 5 ta mahsulot, tilga mos narx so'm/сум/sum
[ ] "GLS-XXXX" → buyurtma holati uz/ru/en da to'g'ri
[ ] AI_API_KEY bo'sh → source=fallback, to'ldirilsa source=openai (mock test)
[ ] 31-chi so'rov 429
[ ] Floating widget barcha sahifada, mobile 92vw, scroll avtomatik
[ ] localStorage session_key saqlanadi, 2-chi xabar history bilan ketadi
[ ] XSS: "<script>" yuborilsa x-text bilan escape
[ ] Til almashsa (UZ→RU) welcome va placeholder ham almashadi
```

---

## 14. Ochiq Savollar

1. OpenAI kaliti kim beradi? (hozir fallback)
2. Kredit tizimi chatbot uchun ham kerakmi? (hozir faqat marketing da)
3. RAG uchun vektor DB (pgvector / Pinecone) qayerda?

*Hujjat — ideal daraja; fallback hozir ishlab turibdi, OpenAI kalit qo'shilishi bilan darhol `source=openai` ga o'tadi.*
