# ARMENU — Admin Panel Design Spec

## Sahifa: `/django-admin/` yoki `/v1/admin/` (Restoran boshqaruvi)

## Sidebar
- Dashboard 📊
- Menyu 🍽️ (kategoriyalar + taomlar)
- Buyurtmalar 📋
- Stollar 🪑
- To'lovlar 💰
- Analitika 📈
- Xodimlar 👥
- Sozlamalar ⚙️

## Dashboard
- **KPI cards**: Bugun tushgan buyurtmalar, tushum, o'rtacha chek, mijozlar
- **Chart**: 7 kunlik tushum (line chart)
- **Last orders**: Oxirgi 10 ta buyurtma (jadval)

## Menyu boshqaruvi
- Kategoriyalar ro'yxati (drag & drop tartib)
- Taom qo'shish/tahrirlash form:
  - Nomi (uz/ru/en)
  - Narx
  - Rasm yuklash
  - 3D model URL
  - Diet tags (checkbox)
  - Allergens (checkbox)
  - Toggle: mavjud/to'xtatilgan

## Design
- **Theme**: Dark sidebar (#1A1A2E), white content area
- **Accent**: #E85D2A
- **Table**: Zebra stripes, hover highlight
- **Form inputs**: Rounded, focus ring #E85D2A
- **Responsive**: Sidebar collapse on tablet
