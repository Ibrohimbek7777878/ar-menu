import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'providers/admin_theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'config/app_colors.dart';
import 'config/app_text_styles.dart';
import 'config/router_config.dart';
import 'providers/shop_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/product_provider.dart';
import 'providers/admin_settings_provider.dart';
import 'providers/location_provider.dart';
import 'providers/weather_provider.dart';
import 'providers/language_provider.dart';
import 'providers/wishlist_provider.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase initialization (backend setup kerak)
  try {
    await Firebase.initializeApp();
    // Crashlytics — xatoliklarni yozish
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
  } catch (e) {
    // Firebase hali sozlanmagan bo'lsa, davom et
    debugPrint('Firebase hali sozlanmagan: $e');
  }

  // Push notification service
  try {
    await NotificationService().initialize();
  } catch (e) {
    debugPrint('Notification service xatosi: $e');
  }

  runApp(const StoreGulistonApp());
}

class StoreGulistonApp extends StatelessWidget {
  const StoreGulistonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
        ChangeNotifierProvider(create: (_) => AdminThemeProvider()),
        ChangeNotifierProvider(create: (_) => ShopProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
        ChangeNotifierProvider(create: (_) => AdminSettingsProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => WeatherProvider()),
      ],
      child: Consumer3<AdminSettingsProvider, LanguageProvider, AdminThemeProvider>(
        builder: (context, settingsProvider, languageProvider, themeProvider, child) {
          final primaryColorHex = settingsProvider.getSetting('primary_color');
          final primaryColor = primaryColorHex.isNotEmpty 
              ? Color(int.parse(primaryColorHex.replaceFirst('#', '0xFF')))
              : AppColors.primaryGreen;

          return MaterialApp.router(
            title: settingsProvider.getSetting('app_name').isNotEmpty 
                ? settingsProvider.getSetting('app_name') 
                : 'Online Store Guliston',
            debugShowCheckedModeBanner: false,
            locale: languageProvider.flutterLocale,
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('uz', 'UZ'),
              Locale('ru', 'RU'),
              Locale('en', 'US'),
              Locale('uz', 'Cyrl'),
            ],
            localeResolutionCallback: (deviceLocale, supportedLocales) {
              for (final locale in supportedLocales) {
                if (locale.languageCode == languageProvider.flutterLocale.languageCode) {
                  return locale;
                }
              }
              return supportedLocales.first;
            },
            theme: ThemeData(
              // Light theme customizations

              useMaterial3: true,
              primaryColor: primaryColor,
              scaffoldBackgroundColor: AppColors.background,
              fontFamily: AppTextStyles.fontFamily,
              textTheme: const TextTheme(
                displayLarge: AppTextStyles.displayLarge,
                headlineLarge: AppTextStyles.headlineLarge,
                headlineMedium: AppTextStyles.headlineMedium,
                headlineSmall: AppTextStyles.headlineSmall,
                titleLarge: AppTextStyles.titleLarge,
                bodyLarge: AppTextStyles.bodyLarge,
                bodyMedium: AppTextStyles.bodyMedium,
                bodySmall: AppTextStyles.bodySmall,
                labelLarge: AppTextStyles.button,
              ),
              colorScheme: ColorScheme.light(
                primary: primaryColor,
                secondary: AppColors.accentOrange,
                surface: AppColors.surface,
                error: AppColors.error,
                surfaceContainerLowest: AppColors.background,
              ),
              appBarTheme: AppBarTheme(
                backgroundColor: AppColors.surface,
                foregroundColor: AppColors.textBlack,
                elevation: 0,
                centerTitle: true,
                scrolledUnderElevation: 1,
                shadowColor: AppColors.shadow,
                titleTextStyle: AppTextStyles.headlineSmall.copyWith(
                  color: AppColors.textBlack,
                  fontWeight: FontWeight.w700,
                ),
              ),
              cardTheme: CardThemeData(
                color: AppColors.surface,
                elevation: 0,
                shadowColor: AppColors.shadow,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: AppColors.backgroundGray,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textGray),
              ),
              bottomNavigationBarTheme: const BottomNavigationBarThemeData(
                backgroundColor: AppColors.surface,
                selectedItemColor: AppColors.primaryGreen,
                unselectedItemColor: AppColors.textGray,
                type: BottomNavigationBarType.fixed,
                elevation: 8,
                selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                unselectedLabelStyle: TextStyle(fontSize: 12),
              ),
            ),
            darkTheme: ThemeData(
              useMaterial3: true,
              primaryColor: primaryColor,
              scaffoldBackgroundColor: const Color(0xFF121212),
              fontFamily: AppTextStyles.fontFamily,
              brightness: Brightness.dark,
              colorScheme: ColorScheme.dark(
                primary: primaryColor,
                secondary: AppColors.accentOrange,
                surface: const Color(0xFF1E1E1E),
                error: AppColors.error,
                surfaceContainerLowest: const Color(0xFF0D0D0D),
              ),
              appBarTheme: AppBarTheme(
                backgroundColor: const Color(0xFF1E1E1E),
                foregroundColor: Colors.white,
                elevation: 0,
                centerTitle: true,
                scrolledUnderElevation: 1,
                titleTextStyle: AppTextStyles.headlineSmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              cardTheme: CardThemeData(
                color: const Color(0xFF1E1E1E),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: const Color(0xFF2A2A2A),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                hintStyle: AppTextStyles.bodyMedium.copyWith(color: Colors.grey),
              ),
              bottomNavigationBarTheme: const BottomNavigationBarThemeData(
                backgroundColor: Color(0xFF1E1E1E),
                selectedItemColor: AppColors.primaryGreen,
                unselectedItemColor: Colors.grey,
                type: BottomNavigationBarType.fixed,
                elevation: 8,
                selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                unselectedLabelStyle: TextStyle(fontSize: 12),
              ),
            ),
            routerConfig: goRouter,
            themeMode: themeProvider.themeMode,
          );
        },
      ),
    );
  }
}
