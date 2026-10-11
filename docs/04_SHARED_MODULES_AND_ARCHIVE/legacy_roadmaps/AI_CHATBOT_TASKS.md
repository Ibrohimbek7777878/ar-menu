# AI Chatbot — Ishlar Ro'yxati (Roadmap)

**Manba:** `TZ_AI_CHATBOT_IDEAL.md` (ideal TZ)  
**Holat:** Fallback ishlaydi, OpenAI kalit bilan ideal — quyidagi ketma-ketlik.

## M0 — Poydevor (DONE ✅)
- [x] `ai/models.py:4` ChatSession/ChatMessage
- [x] `ai/ai_service.py:33` _call_openai + fallback (mahsulot qidirish, buyurtma holati)
- [x] `ai/views.py:31` chat_api 30/60 rate_limit, session_key, history[:10]
- [x] `templates/components/ai_chat.html:47` Alpine floating widget, `base.html:102` include
- [x] `i18n_tags.py` ai_chat_* 3 tilda, `ai_service.py` lang uz/ru/en
- [x] Verified: `curl /api/v1/ai/chat/ lang=uz/ru/en` — 3 tilda javob

## M1 — Funksiyani Kengaytirish (1-2 hafta)
- [ ] **RAG vektor qidiruv** — `Product` embeddings `text-embedding-3-small` + `pgvector` (fallback o'rniga semantik, 80% → 95% moslik)
- [ ] **Tavsiya** — `Order` tarixi + collaborative ("sizga yoqishi mumkin" 3 ta mahsulot)
- [ ] **FAQ** — `Shop.working_hours`, `delivery_fee`, `payment` savollarini DB dan to'g'ridan `Q` bilan
- [ ] **Buyurtma ro'yxati** — telefon bo'yicha `Customer.phone` → oxirgi 3 buyurtma matn ko'rinishi (hozir faqat GLS- raqam)

## M2 — UI/UX Ideal (1 hafta)
- [ ] **Tarix paneli** `/admin/ai/sessions/` — ChatSession ro'yxati, qidiruv, o'chirish, eksport
- [ ] **Feedback** — har javobda 👍/👎 → `POST /api/v1/ai/feedback/` + `ChatMessage.feedback`
- [ ] **Source badge** — `openai` yashil, `fallback` kulrang
- [ ] **Mobile audit** — 360/390/768 px da widget 92vw, `x-cloak` flicker 0

## M3 — Xavfsizlik & Monitoring (3 kun)
- [ ] `backend/ratelimit.py` in-memory → `RedisCache` (prod)
- [ ] Log: `logger.info(f"chat lang={lang} source={source} session={key}")`
- [ ] Sentry tag `ai_chat` + `SENTRY_DSN`
- [ ] Kredit (ixtiyoriy) — marketing kabi `ai_credits_monthly` chatbot uchun

## M4 — Prod & Kalit (1 kun)
- [ ] `.env: AI_API_KEY=sk-...` + `AI_TEXT_MODEL_FAST=gpt-4o-mini` → `curl` source=openai test
- [ ] Playwright E2E: uz/ru/en da `salom` + `sut` + `GLS-` 3 tilda, 429 test
- [ ] Docs: `DEPLOY.md` ga AI bo'limi

## Qabul (DoD)
- [ ] 3 tilda salomlashish, mahsulot 5 ta, buyurtma holati, fallback/openai almashinuvi, 31-chi 429, widget barcha sahifada.

## Keyingi Qadam
1. `AI_API_KEY` ni `.env` ga qo'yish → darhol prod
2. M1 RAG → 1 hafta
