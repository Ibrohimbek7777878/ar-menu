/// Authentication repository interface - domain layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/domain/entities/admin_user.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';

abstract class AuthRepository {
  /// Sign in with email and password
  Future<Either<Failure, AdminUser>> signInWithEmailAndPassword(
    String email,
    String password,
  );

  /// Sign out
  Future<void> signOut();

  /// Check if user is admin
  Future<bool> isAdmin(String email);

  /// Get current user
  AdminUser? get currentUser;
}