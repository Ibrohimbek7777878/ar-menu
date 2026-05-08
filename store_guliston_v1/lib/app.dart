import 'package:flutter/material.dart';
import 'package:store_guliston_v1/app_router.dart';
import 'package:store_guliston_v1/config/app_colors.dart';
import 'package:store_guliston_v1/config/app_constants.dart';
import 'package:store_guliston_v1/presentation/pages/splash_page.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryColor,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      initialRoute: SplashPage.routeName,
      onGenerateRoute: AppRouter.generateRoute,
      home: const SplashPage(),
    );
  }
}
