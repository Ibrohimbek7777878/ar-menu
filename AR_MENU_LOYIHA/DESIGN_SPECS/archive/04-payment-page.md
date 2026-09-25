# ARMENU — Payment Page Design Spec

## Sahifa: `/v1/guest/payment/{session_id}/` (To'lov sahifasi)

## Layout
- **Check summary**: Buyurtmalar ro'yxati + jami summa
- **Payment methods**: 3 ta toggle button:
  - 💳 Payme
  - 📱 Click
  - 💵 Naqd pul
- **Tip section**: "Ofitsiantga tip qoldiring" (10%, 15%, 20%, boshqa)
- **Split bill**: "Hisobni bo'lish" tugma → 2-20 ga bo'lish
- **Pay button**: Katta, #E85D2A, "To'lash — 45 000 so'm"

## Design
- **Theme**: Light (#F8FAFC bg)
- **Card**: White, rounded 16px, shadow
- **Method buttons**: Outline, selected = filled accent
- **Animation**: To'lov tugmalganda spinner → success checkmark

## API Response
```json
GET /v1/guest/bill/{session_id}/
{
  "total": 45000,
  "items": [{"name": "Non-ushta 1", "qty": 2, "price": 15000}],
  "service_fee": 0,
  "tip_options": [4500, 6750, 9000]
}
```

## To'lov providerlari
- **Payme**: JSON-RPC webhook, 2% komissiya
- **Click**: MD5 signature, 1.5% komissiya
- **Naqd**: To'g'ridan-to'g'ri, komissiyasiz
