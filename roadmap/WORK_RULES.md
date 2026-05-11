# Online Store Guliston - Work Rules

This file defines the working rules for future code changes in this project.

## 1. User Flow

- Ordinary users must enter the app without login, email, or registration.
- Any visitor can browse stores, products, categories, and place an order.
- Checkout must ask only for name and phone number.
- Cash on delivery is the only active payment flow for now.
- Online payment may appear visually later, but must not be functional yet.

## 2. Admin Flow

- Admin access must stay hidden from ordinary users.
- Admin panel entry should be accessible only through a secret or indirect trigger.
- Normal app screens must not expose admin login or admin actions.

## 3. UI / Navigation Rules

- The app must open directly on the customer Store UI.
- Home/Shop Explorer screen is the first visible screen.
- Splash, login, and register screens must not block the customer flow.
- Navigation changes must preserve the existing app structure unless a change is explicitly requested.

## 4. Data / Integration Rules

- Stores, products, weather, and other app data must be manageable from the admin panel.
- Offline support should keep showing cached store data when internet is unavailable.
- Do not break integration with existing providers, services, or screens when editing one file.

## 5. Safe Editing Rules

- When changing one file, keep compatibility with related files.
- Avoid breaking imports, constructors, nullable fields, and route names.
- Make minimal, targeted edits.
- If a change may affect another file, check that file first before editing.
- Do not remove existing logic unless the task explicitly asks for it.

## 6. Visual Direction

- Use the reference in `roadmap/image.png` as the main interface direction.
- Keep the UI green themed, clean, mobile-first, and Uzbek localized.
- Prefer simple, clear store browsing layouts over login-first flows.

## 7. Working Process

- First read the roadmap and related reference files.
- Then wait for a direct command before changing code.
- After every change, verify that related files still match.
- Keep the project stable and avoid cascading breakage.

