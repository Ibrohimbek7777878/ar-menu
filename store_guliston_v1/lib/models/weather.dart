class Weather {
  final String city;
  final double temperature;
  final String description;
  final String icon;
  final int humidity;
  final double windSpeed;
  final DateTime lastUpdated;

  Weather({
    required this.city,
    required this.temperature,
    required this.description,
    required this.icon,
    required this.humidity,
    required this.windSpeed,
    required this.lastUpdated,
  });

  factory Weather.fromJson(Map<String, dynamic> json) {
    return Weather(
      city: json['city'],
      temperature: json['temperature'],
      description: json['description'],
      icon: json['icon'],
      humidity: json['humidity'],
      windSpeed: json['windSpeed'],
      lastUpdated: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'city': city,
      'temperature': temperature,
      'description': description,
      'icon': icon,
      'humidity': humidity,
      'windSpeed': windSpeed,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }

  String get temperatureString => '${temperature.round()}°C';
  String get humidityString => '$humidity%';
  String get windSpeedString => '${windSpeed.round()} m/s';
}