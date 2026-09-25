import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/weather_provider.dart';
import '../providers/admin_settings_provider.dart';
import '../widgets/weather_widget.dart';
import '../config/app_colors.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadWeather());
  }

  Future<void> _loadWeather() async {
    final settingsProvider = Provider.of<AdminSettingsProvider>(context, listen: false);
    final weatherProvider = Provider.of<WeatherProvider>(context, listen: false);
    final apiKey = settingsProvider.getSetting('weather_api_key');

    if (apiKey.isEmpty) {
      weatherProvider.loadDemoWeather();
      return;
    }

    await weatherProvider.refreshWeather(apiKey);
    if (weatherProvider.currentWeather == null) {
      weatherProvider.loadDemoWeather();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Ob-havo'),
        backgroundColor: AppColors.primaryGreen,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Consumer<WeatherProvider>(
            builder: (context, weatherProvider, child) {
              final currentWeather = weatherProvider.currentWeather;
              final forecast = weatherProvider.forecast;

              if (weatherProvider.isLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hozirgi ob-havo',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textBlack,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (currentWeather == null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: AppRadius.xlargeRadius,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Text(
                        'Ob-havo ma\'lumotlari mavjud emas. Iltimos API kalitini admin sozlamalariga kiriting yoki qayta yuklang.',
                        style: TextStyle(color: AppColors.textGray),
                      ),
                    )
                  else ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: AppRadius.xlargeRadius,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.cloud, size: 32, color: Colors.white),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  currentWeather.city,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const WeatherWidget(),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            currentWeather.description,
                            style: const TextStyle(color: Colors.white70, fontSize: 16),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Namlik: ${currentWeather.humidityString}',
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                              ),
                              Text(
                                'Shamol: ${currentWeather.windSpeedString}',
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Yangilangan: ${currentWeather.lastUpdated.toLocal().toString().split(".").first}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _loadWeather,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Yangilash'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Oldindan ob-havo',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textBlack,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (forecast.isEmpty)
                    const Text(
                      'Oldindan ob-havo ma\'lumotlari mavjud emas.',
                      style: TextStyle(color: AppColors.textGray),
                    )
                  else
                    Column(
                      children: forecast.map((weather) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: AppRadius.largeRadius,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.shadow,
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _getWeatherIcon(weather.icon),
                                size: 30,
                                color: AppColors.primaryGreen,
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      weather.lastUpdated.toLocal().toString().split(' ').first,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textBlack,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      weather.description,
                                      style: const TextStyle(color: AppColors.textGray),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                weather.temperatureString,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryGreen,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  IconData _getWeatherIcon(String iconCode) {
    switch (iconCode.substring(0, 2)) {
      case '01':
        return Icons.wb_sunny;
      case '02':
        return Icons.wb_cloudy;
      case '03':
      case '04':
        return Icons.cloud;
      case '09':
      case '10':
        return Icons.grain;
      case '11':
        return Icons.flash_on;
      case '13':
        return Icons.ac_unit;
      case '50':
        return Icons.blur_on;
      default:
        return Icons.wb_sunny;
    }
  }
}
