class City {
  const City({required this.name, required this.uf});

  final String name;
  final String uf;

  Map<String, Object?> toAnswer() => {'name': name, 'uf': uf};

  static City? fromAnswer(Object? value) => switch (value) {
        {'name': final String name, 'uf': final String uf} => City(name: name, uf: uf),
        _ => null,
      };

  @override
  bool operator ==(Object other) => other is City && other.name == name && other.uf == uf;

  @override
  int get hashCode => Object.hash(name, uf);

  @override
  String toString() => '$name, $uf';
}
