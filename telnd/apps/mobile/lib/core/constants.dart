class AppConstants {
  AppConstants._();

  static const String appName = 'TELND';
  static const String appVersion = '1.0.0';
  
  static const String baseUrl = 'http://localhost:3001';
  static const String webUrl = 'http://localhost:3000';
  
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const Duration debounceDuration = Duration(milliseconds: 500);
}
