# 🍎 iOS FAZA I-10: Android Google Maps API Key
## AndroidManifest.xml ga Google Maps kalitini qo'shish

---

## 🎯 Maqsad
Android da Google Maps ishlashi uchun AndroidManifest.xml ga API Key va permissions qo'shish. Yandex Maps o'rniga Google Maps ishlatilgani uchun Android sozlamalarini ham yangilash kerak.

---

## 📄 Qaysi fayl o'zgaradi?
- `store_guliston_v1/android/app/src/main/AndroidManifest.xml`

---

## 🔧 Nima qilish kerak?

### 1. AndroidManifest.xml ni oching

Fayl: `store_guliston_v1/android/app/src/main/AndroidManifest.xml`

### 2. Google Maps API Key qo'shing

`<application>` tegi ichiga **quyidagini qo'shing**:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
```

**MUHIM:** `"AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"` ni Google Cloud dan olgan API Key bilan almashtiring.

### 3. Permissions qo'shing

`<manifest>` tegi ichiga (application dan oldin) **quyidagini qo'shing**:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

### 4. Yakuniy AndroidManifest.xml ko'rinishi

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.store_guliston_v1">

    <!-- Android Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

    <application
        android:label="Online Store Guliston"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        
        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"/>
        
        <!-- Flutter Embedding -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme"/>
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        
        <meta-data
            android:name="flutterEmbedding"
            android:value="2"/>
    </application>
</manifest>
```

### 5. Agar Android package name ni tekshirish kerak bo'lsa

`android/app/build.gradle` faylini oching va `applicationId` ni tekshiring:

```gradle
defaultConfig {
    applicationId "com.example.store_guliston_v1"  // ← Shu package name
    minSdkVersion 21
    targetSdkVersion 33
    versionCode flutterVersionCode.toInteger()
    versionName flutterVersionName
}
```

Google Cloud Console da API Key ni Android uchun cheklaganda **aynan shu package name** ni ishlating.

---

## ✅ Natija
- ✅ `com.google.android.geo.API_KEY` meta-data qo'shildi
- ✅ Barcha permissions qo'shildi (internet, lokatsiya, kamera)
- ✅ Android da Google Maps ishlaydi
- ✅ Android da lokatsiya va kamera ishlaydi

---

## 🧪 Qanday tekshirish mumkin?

```bash
# Android build test
cd store_guliston_v1
flutter build apk --debug

# Agar build muvaffaqiyatli bo'lsa, hamma narsa to'g'ri
```

---

## ❗ Agar xatolik bo'lsa

### Muammo: "Google Maps not showing on Android"
**Yechim:**
1. `AndroidManifest.xml` da API Key ni tekshiring
2. Google Cloud Console da **Maps SDK for Android** yoqilgan
3. Package name to'g'ri kiritilgan

### Muammo: "App crashes on location request"
**Yechim:** Permissions qo'shilganligini tekshiring

### Muammo: "Camera error"
**Yechim:** `CAMERA` permission qo'shilganligini tekshiring

---

## 📝 Eslatma

- Android da Google Maps ishlashi uchun `API Key` **majburiy**
- `usesCleartextTraffic="true"` — HTTP trafikga ruxsat (development uchun)
- `READ_EXTERNAL_STORAGE` va `WRITE_EXTERNAL_STORAGE` — Android 10 va undan eski versiyalar uchun
- **Android 13+** da `ACCESS_FINE_LOCATION` o'rniga `ACCESS_COARSE_LOCATION` ham yetarli

---

## 🎉 BARCHA 10 TA IOS FAZASI TUGADI!

| # | Faza | Holat |
|---|------|-------|
| I-1 | pubspec.yaml yangilash | ✅ |
| I-2 | Google Maps Service | ✅ |
| I-3 | Info.plist permissions | ✅ |
| I-4 | Google Cloud API Key | ✅ |
| I-5 | Xcode sozlamalari | ✅ |
| I-6 | Location Picker Google Maps | ✅ |
| I-7 | Location Provider iOS | ✅ |
| I-8 | iOS Simulator Test | ✅ |
| I-9 | iOS Release Build | ✅ |
| I-10 | Android Google Maps API Key | ✅ |

---

**iOS uchun barcha sozlamalar tayyor! Endi `flutter run -d "iPhone 15 Pro"` bilan ishga tushirish mumkin.**