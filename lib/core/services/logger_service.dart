/// Logger service

import 'package:flutter/foundation.dart';

// Logger service
class LoggerService {
  static void log(String message, {String? tag, bool isError = false}) {
    if (kDebugMode) {
      final prefix = tag != null ? '[$tag] ' : '';
      final level = isError ? 'ERROR' : 'INFO';
      debugPrint('$prefix[$level] $message');
    }
  }

  static void error(String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    if (kDebugMode) {
      final prefix = tag != null ? '[$tag] ' : '';
      debugPrint('$prefix[ERROR] $message');
      if (error != null) {
        debugPrint('$prefix[ERROR] $error');
      }
      if (stackTrace != null) {
        debugPrint('$prefix[STACK_TRACE] $stackTrace');
      }
    }
  }
}