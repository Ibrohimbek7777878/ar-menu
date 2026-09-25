import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AdminThemeProvider extends ChangeNotifier {
  bool _isDarkMode = false;
  ThemeMode get themeMode => _isDarkMode ? ThemeMode.dark : ThemeMode.light;

  AdminThemeProvider() {
    _loadTheme();
  }

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    _saveTheme();
    notifyListeners();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool('admin_is_dark') ?? false;
    notifyListeners();
  }

  Future<void> _saveTheme() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('admin_is_dark', _isDarkMode);
  }
}
