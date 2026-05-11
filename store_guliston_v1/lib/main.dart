import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:store_guliston/providers/app_providers.dart';
import 'package:store_guliston/screens/home_screen.dart';
import 'config/app_colors.dart';

void main() {
  runApp(const StoreGulistonApp());
}

class StoreGulistonApp extends StatelessWidget {
  const StoreGulistonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: getProviders(),
      child: MaterialApp(
        title: 'Store Guliston',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          // Use Google Fonts - Outfit for modern look
          textTheme: GoogleFonts.outfitTextTheme(
            Theme.of(context).textTheme,
          ).apply(
            bodyColor: AppColors.textBlack,
            displayColor: AppColors.textBlack,
          ),
          
          // Primary color scheme
          primaryColor: AppColors.primaryGreen,
          scaffoldBackgroundColor: AppColors.background,
          colorScheme: const ColorScheme.light(
            primary: AppColors.primaryGreen,
            secondary: AppColors.accentOrange,
            surface: AppColors.surface,
            background: AppColors.background,
            error: AppColors.error,
            onPrimary: Colors.white,
            onSecondary: Colors.white,
            onSurface: AppColors.textBlack,
            onBackground: AppColors.textBlack,
            onError: Colors.white,
          ),
          
          // AppBar theme
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.primaryGreen,
            foregroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
            titleTextStyle: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          
          // Card theme with rounded corners and soft shadows
          cardTheme: CardThemeData(
            color: AppColors.surface,
            elevation: 2,
            shadowColor: AppColors.shadow,
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.largeRadius,
            ),
          ),
          
          // Elevated button theme
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              elevation: 2,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: AppRadius.largeRadius,
              ),
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          
          // Input decoration theme
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: AppRadius.largeRadius,
              borderSide: const BorderSide(color: AppColors.divider),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.largeRadius,
              borderSide: const BorderSide(color: AppColors.divider),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.largeRadius,
              borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: AppRadius.largeRadius,
              borderSide: const BorderSide(color: AppColors.error),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          
          // Floating action button theme
          floatingActionButtonTheme: const FloatingActionButtonThemeData(
            backgroundColor: AppColors.primaryGreen,
            foregroundColor: Colors.white,
            elevation: 4,
          ),
          
          // Bottom navigation bar theme
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: AppColors.background,
            selectedItemColor: AppColors.primaryGreen,
            unselectedItemColor: AppColors.textLight,
            type: BottomNavigationBarType.fixed,
            elevation: 8,
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
