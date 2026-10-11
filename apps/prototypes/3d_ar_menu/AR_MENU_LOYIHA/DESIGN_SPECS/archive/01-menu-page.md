# ARMENU — Guest Menu Page Design Spec

## Sahifa: `/m/{slug}/` (Mehmon menyusi — QR dan keyin ochiladi)

## Layout
- **Header**: Restoran logosi (chap), til almashtirish (uz/ru/en, o'ng)
- **Category tabs**: Gorizontal scroll — "Non-ushta", "Sho'rva", "Salat" (chiroyli kapsulalar)
- **Dish cards**: 2 ustunli grid (mobile), har birida:
  - Rasm (yuqori, 4:3 ratio)
  - Nomi (qalin)
  - Narx (to'q qizil, "15 000 so'm")
  - "3D" yoki "AR" badge (agar mavjud bo'lsa)
  - "+" tugma (pastki o'ng burchak)
- **Cart bar**: Pastda qotirilgan (sticky) — "Savat: 2 ta taom — 45 000 so'm"
- **Search**: Yuqorida, placeholder "Taom qidirish..."

## Design
- **Theme**: Dark (#0F172A bg, #1E293B card)
- **Accent**: #E85D2A (to'q qizil-orange)
- **Font**: Inter yoki Plus Jakarta Sans
- **Border radius**: 16px (card), 24px (button)
- **Shadow**: `0 4px 24px rgba(0,0,0,0.3)`

## API Response (backend tayyor)
```json
GET /v1/menu/{slug}/?lang=uz
{
  "restaurant": {"name": "ARMENU Demo", "color_primary": "#E85D2A"},
  "categories": [
    {
      "id": 1, "name": "Non-ushta",
      "dishes": [
        {"id": 1, "name": "Non-ushta 1", "price": 15000, "image": "/media/dish1.jpg", "has_3d": true, "rating_avg": 4.5}
      ]
    }
  ]
}
```

## Mobile Responsive
- Max-width: 480px (mobile-first)
- Card gap: 12px
- Padding: 16px
