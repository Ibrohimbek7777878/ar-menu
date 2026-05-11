import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';
import 'location_provider.dart';
import 'shop_provider.dart';
import 'cart_provider.dart';
import 'weather_provider.dart';
import 'order_provider.dart';

List<SingleChildWidget> getProviders() {
  return [
    ChangeNotifierProvider(create: (_) => LocationProvider()),
    ChangeNotifierProvider(create: (_) => ShopProvider()),
    ChangeNotifierProvider(create: (_) => CartProvider()),
    ChangeNotifierProvider(create: (_) => WeatherProvider()),
    ChangeNotifierProvider(create: (_) => OrderProvider()),
  ];
}
