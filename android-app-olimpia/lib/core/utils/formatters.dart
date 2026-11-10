import 'package:intl/intl.dart';

abstract final class Formatters {
  static final _money = NumberFormat.currency(locale: 'pt_BR', symbol: '', decimalDigits: 2);
  static final _date = DateFormat('dd/MM/yyyy');
  static final _iso = DateFormat('yyyy-MM-dd');
  static final _time = DateFormat('HH:mm');

  /// `#0047`
  static String protocol(int n) => '#${n.toString().padLeft(4, '0')}';

  /// `1.234,50`
  static String money(num value) => _money.format(value).trim();

  static String date(DateTime d) => _date.format(d);

  static String isoDate(DateTime d) => _iso.format(d);

  static String time(DateTime d) => _time.format(d.toLocal());

  static DateTime? parseIsoDate(Object? value) => value is String ? DateTime.tryParse(value) : null;

  /// Parses "1.234,56" / "1234,5" / "1234" into a number.
  static double? parseMoney(String text) {
    final digits = text.replaceAll(RegExp(r'[^0-9,]'), '');
    if (digits.isEmpty) return null;
    return double.tryParse(digits.replaceAll(',', '.'));
  }

  static bool isSameDay(DateTime a, DateTime b) {
    final x = a.toLocal(), y = b.toLocal();
    return x.year == y.year && x.month == y.month && x.day == y.day;
  }
}
