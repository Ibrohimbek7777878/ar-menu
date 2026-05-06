/// Global Riverpod providers for the application

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:online_store_guliston/data/repositories/auth_repository_impl.dart';
import 'package:online_store_guliston/data/repositories/shop_repository_impl.dart';
import 'package:online_store_guliston/data/repositories/order_repository_impl.dart';
import 'package:online_store_guliston/domain/repositories/auth_repository.dart';
import 'package:online_store_guliston/domain/repositories/shop_repository.dart';
import 'package:online_store_guliston/domain/repositories/order_repository.dart';

// Global providers
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl();
});

final shopRepositoryProvider = Provider<ShopRepository>((ref) {
  return ShopRepositoryImpl();
});

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepositoryImpl();
});

// State providers
final appThemeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// App state provider
final appStateProvider = StateProvider<AppState>((ref) => AppState.initial());

// App state class
class AppState {
  final bool isLoading;
  final String? errorMessage;
  final String? successMessage;

  const AppState({
    this.isLoading = false,
    this.errorMessage,
    this.successMessage,
  });

  factory AppState.initial() => const AppState();

  AppState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? successMessage,
  }) {
    return AppState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      successMessage: successMessage ?? this.successMessage,
    );
  }
}