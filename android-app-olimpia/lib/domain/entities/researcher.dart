class Researcher {
  const Researcher({required this.code, required this.name, required this.location});

  /// Raw code without separator, e.g. `OTO482`.
  final String code;
  final String name;

  /// Collection point assigned to the researcher.
  final String location;

  /// Display form, e.g. `OTO-482`.
  String get displayCode => code.length > 3 ? '${code.substring(0, 3)}-${code.substring(3)}' : code;
}
