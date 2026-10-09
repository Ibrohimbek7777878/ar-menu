# ARMENU — KDS Board Design Spec

## Sahifa: `/kds/` (Kichen Display System — oshxona uchun)

## Layout
- **Header**: "KDS — Restoran Nomi", soat, yangilanish tugmasi
- **Order cards**: Gorizontal scroll, har bir buyurtma:
  - **Stol raqami** (katta, qalin)
- **Status ranglari**:
  - 🟡 `new` — Yangi (sariq)
  - 🔵 `preparing` — Tayyorlanmoqda (ko'k)
  - 🟢 `ready` — Tayyor (yashil)
  - ⚫ `served` — Berildi (kulrang)
- **Vaqt**: Har bir kartada qolgan vaqt (countdown)
- **Tugmalar**: "Boshlash" → "Tayyor" → "Berildi"

## Design
- **Theme**: Dark (#0D1117 bg)
- **Card bg**: #161B22
- **Font**: JetBrains Mono (raqamlar uchun), Inter (matn)
- **Font size**: Katta — oshxona masofasidan ko'rish uchun
- **Animation**: Yangi buyurtma kelganda pulse effect

## API Response
```json
GET /v1/orders/kds/{token}/
{
  "orders": [
    {
      "id": 1, "table_no": 5, "status": "new",
      "items": [{"name": "Non-ushta 1", "qty": 2}],
      "created_at": "2026-09-13T23:00:00",
      "elapsed_min": 5
    }
  ]
}
```

## WebSocket
- `ws://host/ws/kds/{token}/` — yangi buyurtma real-vaqtda keladi
