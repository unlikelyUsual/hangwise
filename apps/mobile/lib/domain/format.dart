String formatMinor(int minor, String currency) {
  final negative = minor < 0;
  final absolute = minor.abs();
  final whole = absolute ~/ 100;
  final fraction = (absolute % 100).toString().padLeft(2, '0');
  final digits = whole.toString();
  final grouped = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) grouped.write(',');
    grouped.write(digits[index]);
  }
  return '${negative ? '-' : ''}$grouped.$fraction $currency';
}

String formatBangkok(DateTime instant) {
  final local = instant.toUtc().add(const Duration(hours: 7));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '${local.day} ${months[local.month - 1]} ${local.year}, $hour:$minute Asia/Bangkok';
}
