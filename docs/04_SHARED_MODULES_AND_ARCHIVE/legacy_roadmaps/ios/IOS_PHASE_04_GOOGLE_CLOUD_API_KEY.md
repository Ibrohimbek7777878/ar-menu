# 🍎 iOS FAZA I-4: Google Cloud Console — API Key
## Google Maps API Key yaratish

---

## 🎯 Maqsad
Google Cloud Console da Google Maps uchun API Key yaratish. Bu kalit Google Maps, Geocoding va boshqa Google xizmatlaridan foydalanish uchun kerak.

---

## 🌐 Qaysi sayt ishlatiladi?
- `https://console.cloud.google.com`

---

## 🔧 Nima qilish kerak?

### 1. Google Cloud Console ga kiring

Brauzeringizda `https://console.cloud.google.com` ni oching.

- Google akkountingiz bilan kiring
- Agar akkount yo'q bo'lsa, yarating (bepul)

### 2. Loyiha yarating (yoki mavjudini tanlang)

1. Yuqoridagi **Select a project** dropdown ni bosing
2. **New Project** tugmasini bosing
3. Loyiha nomini kiriting: `Online Store Guliston`
4. **Create** tugmasini bosing

### 3. APIs & Services ni toping

1. Chap menyudan **Navigation Menu (☰)** → **APIs & Services** → **Library** ga o'ting
2. Yoki yuqoridagi search ga "APIs & Services" deb yozing

### 4. Kerakli API larni yoqing

**Library** sahifasida quyidagi API larni qidirib, **Enable** tugmasini bosing:

| API | Nima uchun kerak? |
|-----|-------------------|
| ✅ **Maps SDK for iOS** | iOS da Google Maps ko'rsatish |
| ✅ **Maps SDK for Android** | Android da Google Maps ko'rsatish |
| ✅ **Geocoding API** | Koordinata → Manzil, Manzil → Koordinata |
| ✅ **Places API** (ixtiyoriy) | Do'konlarni qidirish va avtoto'ldirish |

**Eng muhimi:** Maps SDK for iOS va Geocoding API ni yoqing.

### 5. API Key yarating

1. Chap menyu → **APIs & Services** → **Credentials** ga o'ting
2. **+ Create Credentials** → **API Key** tugmasini bosing
3. Sizga **API Key** ko'rsatiladi. Masalan: `AIzaSyBvX7f7xxxxxxxxxxxxxxxxxxxxxxxxx`
4. **Copy** tugmasini bosing va kalitni xavfsiz joyga saqlang

### 6. API Key ni cheklash (Security) — MUHIM!

API Key ni hech kim o'g'irlamasligi uchun cheklash kerak:

1. Credentials sahifasida yaratilgan API Key ni bosing
2. **Application restrictions** bo'limida:
   - **HTTP referrers (web sites)** → emas
   - **IP addresses** → emas
   - **Android apps** → **TANLANG**
   - **iOS apps** → **TANLANG**

#### Android uchun:
1. **Android apps** ni tanlang
2. **Package name** ni kiriting: `com.example.store_guliston_v1`
3. **SHA-1 certificate fingerprint** ni kiriting:
   ```bash
   # Terminal da quyidagi buyruqni bajaring:
   cd ~/.android
   keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   Natijadagi `SHA1:` dan keyingi qiymatni ko'chiring (masalan: `5E:8F:16:...`)

#### iOS uchun:
1. **iOS apps** ni tanlang
2. **Bundle ID** ni kiriting: `com.example.storeGuliston`

### 7. Billing ni yoqing

Google Maps API larni ishlatish uchun billing account kerak:

1. **Navigation Menu (☰)** → **Billing** ga o'ting
2. **Link a billing account** tugmasini bosing
3. Ma'lumotlarni to'ldiring (karta kerak)
4. **Bepul $200 credit** har oy beriladi — kichik loyihalar uchun yetarli

---

## ✅ Natija
- ✅ Google Cloud loyihasi yaratildi
- ✅ Maps SDK for iOS yoqildi
- ✅ Maps SDK for Android yoqildi
- ✅ Geocoding API yoqildi
- ✅ API Key yaratildi va saqlandi
- ✅ Android va iOS uchun cheklandi
- ✅ Billing yoqildi

---

## ❗ Agar xatolik bo'lsa

### Muammo: "API Key not found"
**Yechim:** Keyingi fazalarda API Key ni qayta tekshiring.

### Muammo: "Billing must be enabled"
**Yechim:** Billing account ni yoqing. Google $200 bepul credit beradi.

### Muammo: "SHA-1 keytool not found"
```bash
# Agar keytool topilmasa, Java o'rnatilganligini tekshiring:
java -version

# Yoki to'g'ridan-to'g'ri yo'lni yozing:
/usr/lib/jvm/java-11-openjdk-amd64/bin/keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Muammo: "iOS Bundle ID not found"
Xcode da loyiha nomini tekshiring (keyingi fazada o'rnatiladi).

---

## 📝 Eslatma

- **API Key ni hech kimga bermang!** 
- Agar API Key oshkor bo'lsa, Google Cloud Console da uni o'chirib, yangisini yarating
- Bepul limit: Oyiga $200 ($28,000 ta map load)
- Kichik loyiha uchun bu **bepul** degani

---

## 🔗 Keyingi faza
Faza I-5: Xcode sozlamalari (AppDelegate + Podfile)