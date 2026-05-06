/// Failure class - domain layer

import 'package:equatable/equatable.dart';

// Failure class
class Failure extends Equatable {
  final String message;

  const Failure(this.message);

  @override
  List<Object?> get props => [message];
}