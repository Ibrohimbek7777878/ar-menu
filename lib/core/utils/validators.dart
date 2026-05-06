/// Validation utilities

// Email validator
bool isValidEmail(String email) {
  final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$');
  return emailRegex.hasMatch(email);
}

// Phone number validator
bool isValidPhoneNumber(String phoneNumber) {
  final phoneRegex = RegExp(r'^\+998[0-9]{9}$');
  return phoneRegex.hasMatch(phoneNumber);
}

// Password validator
bool isValidPassword(String password) {
  return password.length >= 6;
}

// Non-empty validator
bool isNotEmpty(String value) {
  return value.trim().isNotEmpty;
}