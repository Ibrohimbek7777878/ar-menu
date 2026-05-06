/// Core error handling

// Core failure classes
abstract class Failure {
  final String message;

  const Failure(this.message);
}

// Network failure
class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

// Cache failure
class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

// Server failure
class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

// Unexpected failure
class UnexpectedFailure extends Failure {
  const UnexpectedFailure(super.message);
}