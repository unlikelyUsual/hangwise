class AppConfig {
  const AppConfig({required this.baseUrl, required this.devSecret});

  final String baseUrl;
  final String devSecret;

  static const fromEnvironment = AppConfig(
    baseUrl: String.fromEnvironment('API_BASE_URL', defaultValue: 'http://127.0.0.1:3000'),
    devSecret: String.fromEnvironment('DEV_AUTH_SECRET', defaultValue: 'hangwise-dev-secret'),
  );

  String get normalizedBaseUrl => baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
}
