import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/weather_provider.dart';

class WeatherWidget extends StatelessWidget {
  const WeatherWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<WeatherProvider>(
      builder: (context, weatherProvider, child) {
        final weather = weatherProvider.currentWeather;

        if (weather == null) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(
                _getWeatherIcon(weather.icon),
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 4),
              Text(
                '${weather.temperature.round()}°C',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  IconData _getWeatherIcon(String iconCode) {
    // Map OpenWeatherMap icon codes to Flutter icons
    switch (iconCode.substring(0, 2)) {
      case '01': // clear sky
        return Icons.wb_sunny;
      case '02': // few clouds
        return Icons.wb_cloudy;
      case '03': // scattered clouds
      case '04': // broken clouds
        return Icons.cloud;
      case '09': // shower rain
      case '10': // rain
        return Icons.grain;
      case '11': // thunderstorm
        return Icons.flash_on;
      case '13': // snow
        return Icons.ac_unit;
      case '50': // mist
        return Icons.blur_on;
      default:
        return Icons.wb_sunny;
    }
  }
}
