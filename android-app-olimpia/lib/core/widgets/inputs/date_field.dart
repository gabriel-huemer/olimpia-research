import 'package:flutter/material.dart';

import '../../resources/app_text_styles.dart';
import '../../utils/formatters.dart';
import 'oto_text_field.dart';

/// Read-only box that opens the date picker (no free typing → no malformed dates).
class DateField extends StatelessWidget {
  const DateField({super.key, required this.value, required this.onChanged, this.firstDate, this.hint = 'dd/mm/aaaa'});

  final DateTime? value;
  final ValueChanged<DateTime> onChanged;
  final DateTime? firstDate;
  final String hint;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final first = firstDate ?? DateTime(now.year - 2);
    final initial = value ?? (now.isBefore(first) ? first : now);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: DateTime(now.year + 2),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () => _pick(context),
        child: OtoInputBox(
          child: Text(
            value == null ? hint : Formatters.date(value!),
            style: value == null ? AppTextStyles.inputHint : AppTextStyles.input,
          ),
        ),
      );
}
