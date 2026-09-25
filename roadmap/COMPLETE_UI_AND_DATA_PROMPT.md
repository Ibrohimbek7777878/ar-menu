# 🚀 ONLINE STORE GULISTON — INTERFACE VA MA'LUMOTLARNI TO'LIQ JONLANTIRISH
## AI Tools uchun tayyor prompt — UI/UX Overhaul + Real Products Data

---

## 🎯 MAQSAD

Hozirgi loyihada **2 ta asosiy muammo** bor:
1. ❌ **Interface oddiy va jozibador emas** — zamonaviy dizayn yo'q
2. ❌ **Mahsulotlar demo/bo'sh** — real ma'lumotlar yo'q

**Bu promptdan keyin:**
- ✅ **Zamonaviy, jozibador, professional interface**
- ✅ **25 ta real mahsulot** (rasm, narx, tavsif, kategoriya)
- ✅ **10 ta real do'kon** (manzil, telefon, lokatsiya)
- ✅ **5 ta kategoriya** (ikonlar bilan)
- ✅ **Animatsiyalar va mikrointeraksiyalar**
- ✅ **Real O'zbekiston bozor narxlari**

---

## 📱 QISM 1: INTERFACE OVERHAUL — ZAMONAVIY DIZAYN

---

### 1.1 DIZAYN TILI — Modern E-commerce Style

#### Ranglar (O'zgartirilgan — yanada jozibador)

```dart
// lib/core/constants/colors.dart

import 'package:flutter/material.dart';

class AppColors {
  // Primary — To'q yashil (tabiiy, ishonchli)
  static const primary = Color(0xFF2E7D32);           // Forest Green
  static const primaryLight = Color(0xFF60AD5E);       // Light Forest
  static const primaryDark = Color(0xFF005005);        // Dark Forest
  static const primarySurface = Color(0xFFE8F5E9);     // Very Light Green
  
  // Accent — Apelsin (call-to-action, energiya)
  static const accent = Color(0xFFFF6F00);             // Deep Orange
  static const accentLight = Color(0xFFFF9E40);        // Light Orange
  static const accentDark = Color(0xFFC43E00);         // Dark Orange
  
  // Neutral
  static const background = Color(0xFFFAFAFA);         // Off-white
  static const surface = Color(0xFFFFFFFF);            // Pure white
  static const surfaceVariant = Color(0xFFF5F5F5);     // Light gray
  
  // Text
  static const textPrimary = Color(0xFF212121);        // Almost black
  static const textSecondary = Color(0xFF757575);      // Medium gray
  static const textDisabled = Color(0xFFBDBDBD);       // Light gray
  
  // Borders
  static const border = Color(0xFFE0E0E0);             // Border gray
  static const divider = Color(0xFFEEEEEE);            // Divider gray
  
  // Semantic
  static const success = Color(0xFF4CAF50);            // Green
  static const error = Color(0xFFE53935);              // Red
  static const warning = Color(0xFFFFA726);            // Orange
  static const info = Color(0xFF42A5F5);               // Blue
  
  // Status
  static const statusOpen = Color(0xFF4CAF50);         // Green
  static const statusClosed = Color(0xFFE53935);       // Red
  static const statusPending = Color(0xFFFFA726);      // Orange
  static const statusDelivering = Color(0xFF42A5F5);   // Blue
  static const statusDelivered = Color(0xFF66BB6A);    // Light green
  
  // Gradients
  static const gradientPrimary = LinearGradient(
    colors: [Color(0xFF2E7D32), Color(0xFF60AD5E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const gradientAccent = LinearGradient(
    colors: [Color(0xFFFF6F00), Color(0xFFFF9E40)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  // Shadows
  static List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Colors.black.withOpacity(0.08),
      blurRadius: 4,
      offset: Offset(0, 2),
    ),
  ];
  
  static List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Colors.black.withOpacity(0.12),
      blurRadius: 8,
      offset: Offset(0, 4),
    ),
  ];
  
  static List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Colors.black.withOpacity(0.16),
      blurRadius: 16,
      offset: Offset(0, 8),
    ),
  ];
}
```

#### Typography (Yangi — hierarchy aniq)

```dart
// lib/core/constants/text_styles.dart

import 'package:flutter/material.dart';
import 'colors.dart';

class AppTextStyles {
  static const fontFamily = 'Inter'; // Modern, clean font
  
  // Display (Katta sarlavhalar)
  static const displayLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 40,
    fontWeight: FontWeight.bold,
    height: 1.2,
    letterSpacing: -0.5,
    color: AppColors.textPrimary,
  );
  
  static const displayMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.bold,
    height: 1.2,
    letterSpacing: -0.5,
    color: AppColors.textPrimary,
  );
  
  // Headings
  static const h1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 28,
    fontWeight: FontWeight.bold,
    height: 1.3,
    color: AppColors.textPrimary,
  );
  
  static const h2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppColors.textPrimary,
  );
  
  static const h3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: AppColors.textPrimary,
  );
  
  static const h4 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: AppColors.textPrimary,
  );
  
  // Body
  static const bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.normal,
    height: 1.6,
    color: AppColors.textPrimary,
  );
  
  static const bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.normal,
    height: 1.5,
    color: AppColors.textPrimary,
  );
  
  static const bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.normal,
    height: 1.4,
    color: AppColors.textSecondary,
  );
  
  // Special
  static const button = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
    color: Colors.white,
  );
  
  static const buttonSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.3,
    color: Colors.white,
  );
  
  static const caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AppColors.textSecondary,
  );
  
  static const overline = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.5,
    color: AppColors.textSecondary,
  );
  
  // Price
  static const priceXLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: AppColors.primary,
  );
  
  static const priceLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.primary,
  );
  
  static const priceMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.primary,
  );
  
  static const priceSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.primary,
  );
}
```

---

### 1.2 SHIMMERLI PRODUCT CARD (Zamonaviy)

```dart
// lib/widgets/product_card.dart

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/constants/colors.dart';
import '../core/constants/text_styles.dart';
import '../models/product.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;

  const ProductCard({
    required this.product,
    this.onTap,
    this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: AppColors.shadowSm,
          border: Border.all(color: AppColors.border, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: product.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: product.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: AppColors.surfaceVariant,
                              child: Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation(AppColors.primary),
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: AppColors.surfaceVariant,
                              child: Icon(Icons.shopping_bag, size: 48, color: AppColors.textDisabled),
                            ),
                          )
                        : Container(
                            color: AppColors.surfaceVariant,
                            child: Icon(Icons.shopping_bag, size: 48, color: AppColors.textDisabled),
                          ),
                  ),
                ),
                
                // Availability badge
                if (!product.isAvailable)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Tugagan',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                
                // Discount badge (agar chegirma bo'lsa)
                if (product.discountPercent != null && product.discountPercent! > 0)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '-${product.discountPercent}%',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            
            // Content
            Expanded(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name
                    Text(
                      product.name,
                      style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    SizedBox(height: 4),
                    
                    // Unit
                    Text(
                      product.unit ?? 'dona',
                      style: AppTextStyles.caption,
                    ),
                    
                    Spacer(),
                    
                    // Price and cart button
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (product.discountPercent != null && product.discountPercent! > 0)
                                Text(
                                  '${product.price.toStringAsFixed(0)} so\'m',
                                  style: AppTextStyles.bodySmall.copyWith(
                                    decoration: TextDecoration.lineThrough,
                                    color: AppColors.textDisabled,
                                  ),
                                ),
                              Text(
                                '${product.finalPrice.toStringAsFixed(0)} so\'m',
                                style: AppTextStyles.priceMedium,
                              ),
                            ],
                          ),
                        ),
                        
                        // Add to cart button
                        Material(
                          color: product.isAvailable ? AppColors.primary : AppColors.textDisabled,
                          borderRadius: BorderRadius.circular(12),
                          child: InkWell(
                            onTap: product.isAvailable ? onAddToCart : null,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: EdgeInsets.all(8),
                              child: Icon(
                                Icons.add_shopping_cart,
                                size: 20,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### 1.3 ZAMONAVIY SHOP CARD

```dart
// lib/widgets/shop_card.dart

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/colors.dart';
import '../core/constants/text_styles.dart';
import '../models/shop.dart';

class ShopCard extends StatelessWidget {
  final Shop shop;
  final VoidCallback? onTap;

  const ShopCard({required this.shop, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: AppColors.shadowMd,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image banner
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  child: AspectRatio(
                    aspectRatio: 2.5,
                    child: shop.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: shop.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: AppColors.surfaceVariant,
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: AppColors.primarySurface,
                              child: Icon(Icons.store, size: 64, color: AppColors.primary),
                            ),
                          )
                        : Container(
                            color: AppColors.primarySurface,
                            child: Icon(Icons.store, size: 64, color: AppColors.primary),
                          ),
                  ),
                ),
                
                // Status badge
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: shop.isOpen ? AppColors.statusOpen : AppColors.statusClosed,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: AppColors.shadowSm,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                        SizedBox(width: 6),
                        Text(
                          shop.isOpen ? 'Ochiq' : 'Yopiq',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            
            // Content
            Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and rating
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          shop.name,
                          style: AppTextStyles.h3,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      SizedBox(width: 8),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.star, size: 16, color: AppColors.warning),
                            SizedBox(width: 4),
                            Text(
                              shop.rating.toStringAsFixed(1),
                              style: AppTextStyles.bodySmall.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.warning,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  SizedBox(height: 12),
                  
                  // Address
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 18, color: AppColors.textSecondary),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          shop.address,
                          style: AppTextStyles.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  
                  SizedBox(height: 8),
                  
                  // Working hours
                  Row(
                    children: [
                      Icon(Icons.access_time_outlined, size: 18, color: AppColors.textSecondary),
                      SizedBox(width: 6),
                      Text(
                        '${shop.openingTime} - ${shop.closingTime}',
                        style: AppTextStyles.bodySmall,
                      ),
                      Spacer(),
                      if (shop.distance != null)
                        Text(
                          '${shop.distance!.toStringAsFixed(1)} km',
                          style: AppTextStyles.bodySmall.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                    ],
                  ),
                  
                  SizedBox(height: 16),
                  
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _callShop(shop.phone),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: EdgeInsets.symmetric(vertical: 12),
                          ),
                          icon: Icon(Icons.phone, size: 18, color: AppColors.primary),
                          label: Text(
                            'Qo\'ng\'iroq',
                            style: AppTextStyles.buttonSmall.copyWith(color: AppColors.primary),
                          ),
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: onTap,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                          ),
                          icon: Icon(Icons.shopping_bag_outlined, size: 18),
                          label: Text('Mahsulotlar', style: AppTextStyles.buttonSmall),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _callShop(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }
}
```

---

## 📦 QISM 2: REAL MA'LUMOTLAR — 25 TA MAHSULOT

---

### 2.1 SEED DATA — TO'LIQ YANGILANGAN

```dart
// lib/database/seed_data.dart

import 'package:sqflite/sqflite.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class SeedData {
  static Future<void> populateDatabase(Database db) async {
    // 1. Categories
    await _insertCategories(db);
    
    // 2. Shops
    await _insertShops(db);
    
    // 3. Products (25 ta real mahsulot)
    await _insertProducts(db);
    
    // 4. Admin
    await _insertAdmin(db);
    
    // 5. App texts
    await _insertAppTexts(db);
    
    // 6. App settings
    await _insertAppSettings(db);
  }

  static Future<void> _insertCategories(Database db) async {
    final categories = [
      {
        'id': 'cat_food',
        'name': 'Oziq-ovqat',
        'color': '#4CAF50',
        'sort_order': 1,
      },
      {
        'id': 'cat_drinks',
        'name': 'Ichimliklar',
        'color': '#2196F3',
        'sort_order': 2,
      },
      {
        'id': 'cat_dairy',
        'name': 'Sut mahsulotlari',
        'color': '#FF9800',
        'sort_order': 3,
      },
      {
        'id': 'cat_meat',
        'name': 'Go\'sht va baliq',
        'color': '#F44336',
        'sort_order': 4,
      },
      {
        'id': 'cat_vegetables',
        'name': 'Sabzavot va mevalar',
        'color': '#8BC34A',
        'sort_order': 5,
      },
    ];

    for (var cat in categories) {
      await db.insert('categories', cat, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  static Future<void> _insertShops(Database db) async {
    final shops = [
      {
        'id': 'shop_1',
        'name': 'Yangi Yer Supermarket',
        'address': 'Markaziy ko\'cha 45, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5966,
        'longitude': 68.7786,
        'phone': '+998901234567',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.5,
        'category_id': 'cat_food',
      },
      {
        'id': 'shop_2',
        'name': 'Choy va Kofe Dunyosi',
        'address': 'Guliston ko\'cha 12, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5980,
        'longitude': 68.7800,
        'phone': '+998901234568',
        'opening_time': '07:00',
        'closing_time': '23:00',
        'is_open': 1,
        'rating': 4.2,
        'category_id': 'cat_drinks',
      },
      {
        'id': 'shop_3',
        'name': 'Fresh Sut Mahsulotlari',
        'address': 'Navoiy ko\'chasi 89, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5950,
        'longitude': 68.7750,
        'phone': '+998901234569',
        'opening_time': '06:00',
        'closing_time': '21:00',
        'is_open': 1,
        'rating': 4.7,
        'category_id': 'cat_dairy',
      },
      {
        'id': 'shop_4',
        'name': 'Premium Go\'sht Bozori',
        'address': 'Dehqon bozori, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5990,
        'longitude': 68.7820,
        'phone': '+998901234570',
        'opening_time': '07:00',
        'closing_time': '19:00',
        'is_open': 1,
        'rating': 4.4,
        'category_id': 'cat_meat',
      },
      {
        'id': 'shop_5',
        'name': 'Toza Sabzavot va Mevalar',
        'address': 'Amir Temur ko\'chasi 156, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5920,
        'longitude': 68.7730,
        'phone': '+998901234571',
        'opening_time': '05:00',
        'closing_time': '20:00',
        'is_open': 1,
        'rating': 4.6,
        'category_id': 'cat_vegetables',
      },
      {
        'id': 'shop_6',
        'name': 'Guliston Mega Market',
        'address': 'O\'zbekiston ko\'chasi 234, Guliston',
        'city': 'guliston',
        'latitude': 40.4871,
        'longitude': 68.7845,
        'phone': '+998901234572',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.3,
        'category_id': 'cat_food',
      },
      {
        'id': 'shop_7',
        'name': 'Arzon Narx Do\'koni',
        'address': 'Sirdaryo ko\'chasi 67, Guliston',
        'city': 'guliston',
        'latitude': 40.4890,
        'longitude': 68.7870,
        'phone': '+998901234573',
        'opening_time': '09:00',
        'closing_time': '21:00',
        'is_open': 1,
        'rating': 4.0,
        'category_id': 'cat_food',
      },
      {
        'id': 'shop_8',
        'name': 'Elite Ichimliklar',
        'address': 'Mustaqillik ko\'chasi 45, Guliston',
        'city': 'guliston',
        'latitude': 40.4850,
        'longitude': 68.7820,
        'phone': '+998901234574',
        'opening_time': '10:00',
        'closing_time': '23:00',
        'is_open': 1,
        'rating': 4.5,
        'category_id': 'cat_drinks',
      },
      {
        'id': 'shop_9',
        'name': 'Bio Organik Mahsulotlar',
        'address': 'Ipak yo\'li ko\'chasi 12, Guliston',
        'city': 'guliston',
        'latitude': 40.4910,
        'longitude': 68.7900,
        'phone': '+998901234575',
        'opening_time': '08:00',
        'closing_time': '20:00',
        'is_open': 1,
        'rating': 4.8,
        'category_id': 'cat_vegetables',
      },
      {
        'id': 'shop_10',
        'name': 'Halol Go\'sht Markazi',
        'address': 'Tinchlik ko\'chasi 89, Guliston',
        'city': 'guliston',
        'latitude': 40.4880,
        'longitude': 68.7850,
        'phone': '+998901234576',
        'opening_time': '07:00',
        'closing_time': '19:00',
        'is_open': 1,
        'rating': 4.6,
        'category_id': 'cat_meat',
      },
    ];

    for (var shop in shops) {
      await db.insert('shops', shop, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  static Future<void> _insertProducts(Database db) async {
    final products = [
      // Oziq-ovqat (shop_1, shop_6, shop_7)
      {
        'id': 'prod_1',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Non oq (1 dona)',
        'description': 'Yangi pishirilgan oq non, yumshoq va mazali',
        'price': 2500.0,
        'unit': 'dona',
        'is_available': 1,
        'stock_quantity': 200,
      },
      {
        'id': 'prod_2',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Guruch Premium',
        'description': 'Toshkent guruch, yuqori sifatli, 1 kg',
        'price': 12000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 150,
      },
      {
        'id': 'prod_3',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Makaron Arpa Shaly',
        'description': 'Yuqori navli makaron, 400g',
        'price': 5500.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 80,
      },
      {
        'id': 'prod_4',
        'shop_id': 'shop_6',
        'category_id': 'cat_food',
        'name': 'Un Premium',
        'description': 'Yuqori navli bug\'doy uni, 1 kg',
        'price': 7000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 120,
      },
      {
        'id': 'prod_5',
        'shop_id': 'shop_7',
        'category_id': 'cat_food',
        'name': 'Shakar qand',
        'description': 'Oq shakar, toza va sifatli, 1 kg',
        'price': 9500.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 100,
      },
      
      // Ichimliklar (shop_2, shop_8)
      {
        'id': 'prod_6',
        'shop_id': 'shop_2',
        'category_id': 'cat_drinks',
        'name': 'Choy Ahmad Tea',
        'description': 'Qora choy, English Breakfast, 100g',
        'price': 28000.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 40,
      },
      {
        'id': 'prod_7',
        'shop_id': 'shop_2',
        'category_id': 'cat_drinks',
        'name': 'Kofe Nescafe Classic',
        'description': 'Instant kofe, 100g',
        'price': 35000.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 30,
      },
      {
        'id': 'prod_8',
        'shop_id': 'shop_2',
        'category_id': 'cat_drinks',
        'name': 'Suv "Nestlé Pure Life"',
        'description': 'Toza suv, 1.5 litr',
        'price': 3500.0,
        'unit': 'litr',
        'is_available': 1,
        'stock_quantity': 200,
      },
      {
        'id': 'prod_9',
        'shop_id': 'shop_8',
        'category_id': 'cat_drinks',
        'name': 'Coca-Cola',
        'description': 'Gazlangan ichimlik, 1.5 litr',
        'price': 8000.0,
        'unit': 'litr',
        'is_available': 1,
        'stock_quantity': 150,
      },
      {
        'id': 'prod_10',
        'shop_id': 'shop_8',
        'category_id': 'cat_drinks',
        'name': 'Sharbat "Rich"',
        'description': 'Meva sharbati, olma, 1 litr',
        'price': 6500.0,
        'unit': 'litr',
        'is_available': 1,
        'stock_quantity': 80,
      },
      
      // Sut mahsulotlari (shop_3)
      {
        'id': 'prod_11',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Sut "Lactel"',
        'description': 'Pasterlangan sut, 3.2% yog\'li, 1 litr',
        'price': 9000.0,
        'unit': 'litr',
        'is_available': 1,
        'stock_quantity': 60,
      },
      {
        'id': 'prod_12',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Qatiq "Galla"',
        'description': 'Tabiiy qatiq, 500ml',
        'price': 5000.0,
        'unit': 'dona',
        'is_available': 1,
        'stock_quantity': 50,
      },
      {
        'id': 'prod_13',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Tvorog',
        'description': 'Toza tvorog, 5% yog\'li, 250g',
        'price': 7500.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 40,
      },
      {
        'id': 'prod_14',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Sariyog\' "Madina"',
        'description': 'Tabiiy sariyog\', 82.5% yog\'li, 200g',
        'price': 25000.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 30,
      },
      {
        'id': 'prod_15',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Yogurt "Danone"',
        'description': 'Mevali yogurt, 125g',
        'price': 4000.0,
        'unit': 'dona',
        'is_available': 1,
        'stock_quantity': 100,
      },
      
      // Go'sht va baliq (shop_4, shop_10)
      {
        'id': 'prod_16',
        'shop_id': 'shop_4',
        'category_id': 'cat_meat',
        'name': 'Mol go\'shti (yirik)',
        'description': 'Yangi mol go\'shti, yumshoq qism, 1 kg',
        'price': 75000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 25,
      },
      {
        'id': 'prod_17',
        'shop_id': 'shop_4',
        'category_id': 'cat_meat',
        'name': 'Tovuq go\'shti',
        'description': 'Yangi tovuq go\'shti, 1 kg',
        'price': 28000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 50,
      },
      {
        'id': 'prod_18',
        'shop_id': 'shop_10',
        'category_id': 'cat_meat',
        'name': 'Qo\'y go\'shti',
        'description': 'Halol qo\'y go\'shti, 1 kg',
        'price': 80000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 20,
      },
      {
        'id': 'prod_19',
        'shop_id': 'shop_10',
        'category_id': 'cat_meat',
        'name': 'Kolbasa "Oqtepa"',
        'description': 'Mol go\'shtidan kolbasa, 500g',
        'price': 35000.0,
        'unit': 'paket',
        'is_available': 1,
        'stock_quantity': 40,
      },
      {
        'id': 'prod_20',
        'shop_id': 'shop_4',
        'category_id': 'cat_meat',
        'name': 'Baliq (Karp)',
        'description': 'Yangi karp baliq, 1 kg',
        'price': 40000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 15,
      },
      
      // Sabzavot va mevalar (shop_5, shop_9)
      {
        'id': 'prod_21',
        'shop_id': 'shop_5',
        'category_id': 'cat_vegetables',
        'name': 'Pomidor',
        'description': 'Yangi pomidor, mahalliy, 1 kg',
        'price': 12000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 100,
      },
      {
        'id': 'prod_22',
        'shop_id': 'shop_5',
        'category_id': 'cat_vegetables',
        'name': 'Kartoshka',
        'description': 'Sifatli kartoshka, 1 kg',
        'price': 5000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 200,
      },
      {
        'id': 'prod_23',
        'shop_id': 'shop_9',
        'category_id': 'cat_vegetables',
        'name': 'Olma "Red Delicious"',
        'description': 'Qizil olma, shirin, 1 kg',
        'price': 18000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 80,
      },
      {
        'id': 'prod_24',
        'shop_id': 'shop_9',
        'category_id': 'cat_vegetables',
        'name': 'Apelsin',
        'description': 'Import apelsin, vitamin C boy, 1 kg',
        'price': 25000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 60,
      },
      {
        'id': 'prod_25',
        'shop_id': 'shop_5',
        'category_id': 'cat_vegetables',
        'name': 'Sabzi',
        'description': 'Toza sabzi, 1 kg',
        'price': 8000.0,
        'unit': 'kg',
        'is_available': 1,
        'stock_quantity': 70,
      },
    ];

    for (var product in products) {
      await db.insert('products', product, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  static Future<void> _insertAdmin(Database db) async {
    final passwordHash = sha256.convert(utf8.encode('admin1234')).toString();
    
    await db.insert('admins', {
      'id': 'admin_1',
      'email': 'adminstore@gmail.com',
      'password_hash': passwordHash,
      'full_name': 'Super Admin',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<void> _insertAppTexts(Database db) async {
    final texts = [
      {'key': 'app_name', 'value': 'Online Store Guliston'},
      {'key': 'home_title', 'value': 'Do\'konlar'},
      {'key': 'categories_title', 'value': 'Kategoriyalar'},
      {'key': 'order_button', 'value': 'Buyurtma berish'},
      {'key': 'success_message', 'value': 'Buyurtmangiz qabul qilindi!'},
    ];

    for (var text in texts) {
      await db.insert('app_texts', text, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  static Future<void> _insertAppSettings(Database db) async {
    final settings = [
      {'key': 'primary_color', 'value': '#2E7D32'},
      {'key': 'weather_api_key', 'value': 'YOUR_OPENWEATHER_API_KEY'},
      {'key': 'google_maps_key', 'value': 'YOUR_GOOGLE_MAPS_API_KEY'},
    ];

    for (var setting in settings) {
      await db.insert('app_settings', setting, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }
}
```

---

## 🎬 QISM 3: ANIMATSIYALAR

```dart
// lib/widgets/animated_product_grid.dart

import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import '../models/product.dart';
import 'product_card.dart';

class AnimatedProductGrid extends StatelessWidget {
  final List<Product> products;
  final Function(Product) onProductTap;
  final Function(Product) onAddToCart;

  const AnimatedProductGrid({
    required this.products,
    required this.onProductTap,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    return AnimationLimiter(
      child: GridView.builder(
        padding: EdgeInsets.all(16),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: products.length,
        itemBuilder: (context, index) {
          final product = products[index];
          
          return AnimationConfiguration.staggeredGrid(
            position: index,
            duration: Duration(milliseconds: 375),
            columnCount: 2,
            child: ScaleAnimation(
              child: FadeInAnimation(
                child: ProductCard(
                  product: product,
                  onTap: () => onProductTap(product),
                  onAddToCart: () => onAddToCart(product),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
```

---

## ✅ YAKUNIY CHECKLIST

```
UI/UX:
□ AppColors yangilandi (zamonaviy palette)
□ AppTextStyles yangilandi (hierarchy aniq)
□ ProductCard zamonaviy dizayn
□ ShopCard zamonaviy dizayn
□ Shadows va elevation qo'shildi
□ Gradientlar qo'shildi
□ Animatsiyalar qo'shildi

Ma'lumotlar:
□ 10 ta real do'kon
□ 25 ta real mahsulot
□ Real narxlar (O'zbekiston bozori)
□ To'liq tavsiflar
□ Kategoriyalar to'g'ri belgilangan
□ Stock miqdorlari

Texnik:
□ SQLite seed data to'liq
□ Rasmlar uchun placeholder
□ Caching sozlandi
□ Error handling
```

---

## 🚀 QANDAY ISHLATISH

1. **Vibe Code / Cursor ga bering:**
   ```
   "Bu promptdagi barcha UI komponentlarni yarating va seed data ni to'ldiring.
   Har bir widget alohida fayl bo'lsin.
   Animatsiyalar ham qo'shing."
   ```

2. **Qo'lda yozish uchun:**
   - Har bir widget kodini ko'chirib oling
   - Seed data ni database_helper ga qo'shing
   - Rasmlar uchun placeholder ishlatng

3. **Test qilish:**
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

---

**NATIJA:** Professional, zamonaviy, jozibador interface va 25 ta real mahsulot bilan to'liq ishlaydigan app! 🎉
