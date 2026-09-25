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
    final lastUpdatedValue = json['lastUpdated'];
    return Weather(
      city: json['city'],
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.0,
      description: json['description'],
      icon: json['icon'],
      humidity: (json['humidity'] as num?)?.toInt() ?? 0,
      windSpeed: (json['windSpeed'] as num?)?.toDouble() ?? 0.0,
      lastUpdated: lastUpdatedValue is String
          ? DateTime.tryParse(lastUpdatedValue) ?? DateTime.now()
          : DateTime.now(),
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