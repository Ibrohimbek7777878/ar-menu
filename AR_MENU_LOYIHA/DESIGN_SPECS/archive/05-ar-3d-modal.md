# ARMENU — AR/3D Modal Design Spec

## Modal: Taomni 3D ko'rish (Stolga qo'yib ko'rish)

## Layout
- **Full-screen modal** (overlay: rgba(0,0,0,0.85))
- **Header**: Taom nomi + narx
- **3D Viewer**: model-viewer komponenti (WebXR, QuickLook, Scene Viewer)
- **Bottom panel**:
  - "Stolga qo'yib ko'rish" tugma (AR mode)
  - "Savatga qo'shish" tugma
  - Mode label: "🥽 AR" / "🔄 3D" / "📱 360°" / "🖼 Rasm"
  - Progress bar (model yuklanganda)
  - O'lcham info: "15cm × 10cm"

## Fallback zanjiri (4 bosqich)
1. **AR** — WebXR/QuickLook (haqiqiy AR)
2. **3D** — model-viewer (chiroyli 3D)
3. **360°** — 24 ta rasm sequence (slider bilan)
4. **Rasm** — oddiy poster (fallback)

## Design
- **Close button**: O'ng yuqori burchak, white
- **AR button**: Gradient (#E85D2A → #FF8A65), katta
- **Progress**: Thin bar, accent color
- **Animation**: Modal ochilganda scale-up (0.9 → 1.0)

## API Response
```json
GET /v1/ar/{dish_id}/
{
  "ready": true,
  "name": "Non-ushta 1",
  "glb": "/media/3d/dish1.glb",
  "usdz": "/media/3d/dish1.usdz",
  "poster": "/media/3d/dish1-poster.jpg",
  "preview_360": "/media/360/dish1-{i}.jpg",
  "scale_m": 0.3,
  "real_size_cm": "15×10×5",
  "glb_bytes": 2048000,
  "status": "ready"
}
```
