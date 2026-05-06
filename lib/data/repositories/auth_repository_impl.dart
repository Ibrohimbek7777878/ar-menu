/// Authentication repository implementation - data layer

import 'package:dartz/dartz.dart';
import 'package:online_store_guliston/data/datasources/auth_datasource.dart';
import 'package:online_store_guliston/domain/entities/admin_user.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:online_store_guliston/domain/repositories/auth_repository.dart';

// Auth repository implementation
class AuthRepositoryImpl implements AuthRepository {
  final AuthDatasource _authDatasource;

  AuthRepositoryImpl({
    AuthDatasource? authDatasource,
  }) : _authDatasource = authDatasource ?? AuthDatasource();

  @override
  Future<Either<Failure, AdminUser>> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    return await _authDatasource.signInWithEmailAndPassword(email, password);
  }

  @override
  Future<void> signOut() async {
    await _authDatasource.signOut();
  }

  @override
  Future<bool> isAdmin(String email) async {
    return await _authDatasource.isAdmin(email);
  }

  @override
  AdminUser? get currentUser => _authDatasource.currentUser != null
      ? AdminUser(
          id: _authDatasource.currentUser!.uid,
          email: _authDatasource.currentUser!.email ?? '',
          name: _authDatasource.currentUser!.displayName ?? '',
          role: 'admin',
          createdAt: _authDatasource.currentUser!.metadata.creationTime ?? DateTime.now(),
        )
      : null;
}