/// Authentication datasource - data layer

import 'package:firebase_auth/firebase_auth.dart';
import 'package:online_store_guliston/domain/entities/admin_user.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:dartz/dartz.dart';

// Auth datasource implementation
class AuthDatasource {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Sign in with email and password
  Future<Either<Failure, AdminUser>> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    try {
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = userCredential.user;
      if (user == null) {
        return const Left(Failure('Foydalanuvchi topilmadi'));
      }

      // Create AdminUser entity
      final adminUser = AdminUser(
        id: user.uid,
        email: user.email ?? '',
        name: user.displayName ?? '',
        role: 'admin',
        createdAt: user.metadata.creationTime ?? DateTime.now(),
      );

      return Right(adminUser);
    } on FirebaseAuthException catch (e) {
      String errorMessage = 'Noto\'g\'ri email yoki parol';
      switch (e.code) {
        case 'user-not-found':
          errorMessage = 'Foydalanuvchi topilmadi';
          break;
        case 'wrong-password':
          errorMessage = 'Noto\'g\'ri parol';
          break;
        case 'invalid-email':
          errorMessage = 'Noto\'g\'ri email formati';
          break;
        default:
          errorMessage = e.message ?? 'Autentifikatsiya xatosi';
      }
      return Left(Failure(errorMessage));
    } catch (e) {
      return Left(Failure('Tizim xatosi: ${e.toString()}'));
    }
  }

  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Check if user is admin
  Future<bool> isAdmin(String email) async {
    // In production, check custom claims or admin collection
    final adminEmails = [
      'admin@guliston.uz',
      'admin@yangiyer.uz',
      'admin@example.com',
    ];
    return adminEmails.contains(email);
  }

  // Get current user
  User? get currentUser => _auth.currentUser;
}