# Online Store Guliston - Pulse of Commerce

A modern e-commerce mobile application for Guliston and Yangi Yer cities.

## Project Structure

```
lib/
├── app.dart                # MaterialApp configuration
├── app_router.dart         # Navigation router
├── config/                 # App configuration
│   ├── app_constants.dart
│   ├── app_colors.dart
│   └── firebase_options.dart
├── core/                   # Shared utilities and providers
│   ├── error/              # Error handling
│   ├── providers/          # Global Riverpod providers
│   ├── services/           # Core services (logger, connectivity)
│   └── utils/              # Utility functions
├── data/                   # Data layer
│   ├── datasources/        # Data sources (Firebase, API)
│   ├── models/             # Data models
│   └── repositories/       # Repository implementations
├── domain/                 # Business logic layer
│   ├── entities/           # Domain entities
│   ├── failures/           # Failure classes
│   ├── repositories/        # Repository interfaces
│   └── usecases/           # Business use cases
├── presentation/           # UI layer
│   ├── common_widgets/      # Reusable widgets
│   ├── features/           # Feature-specific UI
│   │   ├── auth/           # Authentication feature
│   │   ├── customer/       # Customer app feature
│   │   └── admin/            # Admin panel feature
│   ├── layouts/            # Responsive layouts
│   └── themes/            # Theme configurations
```

## Features

### Customer App
- City selection (Yangi Yer/Guliston)
- Dynamic home screen with categories and shops
- Shop detail page with products
- Product detail page with image carousel
- Smart shopping cart
- Streamlined checkout process
- Order success confirmation

### Admin Panel
- Secure login
- Dashboard with real-time statistics
- Shop management
- Product management
- Order management with status tracking

## Technology Stack

- **Frontend**: Flutter/Dart
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Maps**: Google/Yandex Maps
- **Architecture**: Clean Architecture
- **State Management**: Riverpod
- **Testing**: Flutter Test

## Getting Started

1. Install Flutter SDK
2. Run `flutter pub get` to install dependencies
3. Configure Firebase project
4. Run `flutter run` to start the app

## License

MIT License