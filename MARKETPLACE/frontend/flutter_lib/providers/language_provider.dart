import 'package:flutter/material.dart';

class LanguageProvider with ChangeNotifier {
  /// Our custom display language (for in-app text via ARB files).
  String _displayLanguageCode = 'uz';
  final List<String> _supportedDisplayLanguages = ['uz', 'ru', 'en', 'uz-Cyrl'];

  /// Flutter's internal locale (for Material/Cupertino widgets).
  /// Flutter only has built-in translations for: en, ru, ar, de, es, fr, ja, ko, pt, zh, etc.
  /// Uzbek (uz) is NOT supported by Flutter's Material library, so we fall back to 'en'.
  Locale _flutterLocale = const Locale('en');

  String get displayLanguageCode => _displayLanguageCode;
  List<String> get supportedDisplayLanguages => _supportedDisplayLanguages;
  Locale get flutterLocale => _flutterLocale;

  /// For MaterialApp.supportedLocales: only locales Flutter actually supports
  List<Locale> get flutterSupportedLocales => const [
    Locale('en'),
    Locale('ru'),
  ];

  void setLocale(String languageCode) {
    if (!_supportedDisplayLanguages.contains(languageCode)) return;
    _displayLanguageCode = languageCode;

    // Map display language to a Flutter-supported locale for Material widgets
    switch (languageCode) {
      case 'ru':
        _flutterLocale = const Locale('ru');
        break;
      default:
        _flutterLocale = const Locale('en');
    }
    Future.microtask(() => notifyListeners());
  }

  String getLanguageName(String languageCode) {
    switch (languageCode) {
      case 'uz':
        return 'O\'zbekcha';
      case 'ru':
        return 'Русский';
      case 'en':
        return 'English';
      case 'uz-Cyrl':
        return 'Ўзбекча (Кирилл)';
      default:
        return 'O\'zbekcha';
    }
  }

  /// Simple in-app translation: returns key if no translation map provided.
  String translate(String key, [Map<String, String>? translations]) {
    if (translations != null && translations.containsKey(key)) {
      return translations[key]!;
    }
    return key;
  }
}
