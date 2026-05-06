/// Login provider - presentation layer

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:online_store_guliston/domain/repositories/auth_repository.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/domain/entities/admin_user.dart';

// Login state enum
enum LoginState {
  initial,
  loading,
  success,
  error,
}

// Login provider
class LoginProvider extends StateNotifier<LoginState> {
  final AuthRepository _authRepository;

  LoginProvider(this._authRepository) : super(LoginState.initial);

  Future<void> login(String email, String password) async {
    state = LoginState.loading;

    final result = await _authRepository.signInWithEmailAndPassword(email, password);

    result.fold(
      (failure) {
        state = LoginState.error;
      },
      (adminUser) {
        state = LoginState.success;
      },
    );
  }
}