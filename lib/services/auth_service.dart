import 'package:firebase_auth/firebase_auth.dart';

// Admin user model
class AdminUser {
  final String email;
  final String name;

  AdminUser({required this.email, required this.name});
}

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Sign in with email and password
  Future<UserCredential> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw Exception(e.message ?? 'Authentication failed');
    }
  }

  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Check if user is admin (in real app, check custom claims or admin collection)
  Future<bool> isAdmin(String email) async {
    // In production, check custom claims or admin collection
    // For MVP, we'll use a simple check against known admin emails
    final adminEmails = [
      'admin@guliston.uz',
      'admin@yangiyer.uz',
      'admin@example.com',
    ];
    return adminEmails.contains(email);
  }
}