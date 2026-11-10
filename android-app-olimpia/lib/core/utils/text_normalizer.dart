/// Accent/case-insensitive normalization used by the offline autocomplete.
abstract final class TextNormalizer {
  static const _from = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
  static const _to = 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn';

  static String normalize(String input) {
    final buffer = StringBuffer();
    for (final rune in input.runes) {
      final char = String.fromCharCode(rune);
      final index = _from.indexOf(char);
      buffer.write(index >= 0 ? _to[index] : char);
    }
    return buffer.toString().toLowerCase().trim();
  }
}
