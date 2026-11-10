import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_text_styles.dart';
import '../../utils/text_normalizer.dart';
import 'choice_controls.dart';
import 'oto_text_field.dart';

typedef SuggestionSearch<T> = Future<List<T>> Function(String query);

/// Shared search state: debounced-free (SQLite is fast) but ignores out-of-order results.
mixin _SearchMixin<W extends StatefulWidget, T> on State<W> {
  final controller = TextEditingController();
  final focus = FocusNode();
  List<T> results = const [];
  int _ticket = 0;

  SuggestionSearch<T> get search;

  Future<void> runSearch(String query) async {
    final ticket = ++_ticket;
    final found = query.trim().isEmpty ? <T>[] : await search(query);
    if (mounted && ticket == _ticket) setState(() => results = found);
  }

  void clearResults() {
    _ticket++;
    setState(() => results = const []);
  }

  @override
  void initState() {
    super.initState();
    focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    controller.dispose();
    focus.dispose();
    super.dispose();
  }
}

/// Offline autocomplete with the typed part highlighted (Figma "dd").
class AutocompleteField<T> extends StatefulWidget {
  const AutocompleteField({
    super.key,
    required this.selectedText,
    required this.search,
    required this.titleOf,
    required this.onSelected,
    this.trailingOf,
    this.hint,
  });

  /// Text of the current answer (null = no answer).
  final String? selectedText;
  final SuggestionSearch<T> search;
  final String Function(T item) titleOf;
  final String Function(T item)? trailingOf;
  final ValueChanged<T> onSelected;
  final String? hint;

  @override
  State<AutocompleteField<T>> createState() => _AutocompleteFieldState<T>();
}

class _AutocompleteFieldState<T> extends State<AutocompleteField<T>> with _SearchMixin<AutocompleteField<T>, T> {
  @override
  SuggestionSearch<T> get search => widget.search;

  @override
  void initState() {
    super.initState();
    controller.text = widget.selectedText ?? '';
    focus.addListener(() {
      // Leaving the field without picking restores the saved answer.
      if (!focus.hasFocus) {
        controller.text = widget.selectedText ?? '';
        clearResults();
      }
    });
  }

  @override
  void didUpdateWidget(AutocompleteField<T> old) {
    super.didUpdateWidget(old);
    if (!focus.hasFocus && widget.selectedText != old.selectedText) controller.text = widget.selectedText ?? '';
  }

  void _pick(T item) {
    widget.onSelected(item);
    controller.text = widget.titleOf(item);
    clearResults();
    focus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final editing = focus.hasFocus;
    final answered = widget.selectedText != null && controller.text == widget.selectedText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OtoInputBox(
          state: editing ? InputBoxState.focused : InputBoxState.idle,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focus,
                  onChanged: runSearch,
                  onTap: () {
                    if (answered) controller.selection = TextSelection(baseOffset: 0, extentOffset: controller.text.length);
                  },
                  style: answered ? AppTextStyles.input : AppTextStyles.inputStrong,
                  cursorColor: AppColors.tealBright,
                  cursorWidth: 2,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration.collapsed(hintText: widget.hint, hintStyle: AppTextStyles.inputHint),
                ),
              ),
              if (answered && !editing) Text('✓', style: AppTextStyles.inputCheck),
            ],
          ),
        ),
        if (editing && results.isNotEmpty) ...[
          const SizedBox(height: 6),
          SuggestionList<T>(
            items: results,
            query: controller.text,
            titleOf: widget.titleOf,
            trailingOf: widget.trailingOf,
            onTap: _pick,
          ),
        ],
      ],
    );
  }
}

/// Several cities as chips inside the input ("Caldas Novas, GO ×" + "Digite…").
class MultiAutocompleteField<T> extends StatefulWidget {
  const MultiAutocompleteField({
    super.key,
    required this.selected,
    required this.search,
    required this.titleOf,
    required this.chipLabelOf,
    required this.onAdd,
    required this.onRemove,
    this.trailingOf,
    this.hint,
  });

  final List<T> selected;
  final SuggestionSearch<T> search;
  final String Function(T item) titleOf;
  final String Function(T item) chipLabelOf;
  final String Function(T item)? trailingOf;
  final ValueChanged<T> onAdd;
  final ValueChanged<T> onRemove;
  final String? hint;

  @override
  State<MultiAutocompleteField<T>> createState() => _MultiAutocompleteFieldState<T>();
}

class _MultiAutocompleteFieldState<T> extends State<MultiAutocompleteField<T>>
    with _SearchMixin<MultiAutocompleteField<T>, T> {
  @override
  SuggestionSearch<T> get search =>
      (q) async => (await widget.search(q)).where((r) => !widget.selected.contains(r)).toList();

  void _pick(T item) {
    widget.onAdd(item);
    controller.clear();
    clearResults();
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OtoInputBox(
            height: null,
            state: focus.hasFocus ? InputBoxState.focused : InputBoxState.idle,
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8.5),
            child: Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                for (final item in widget.selected)
                  OtoChip(
                    compact: true,
                    selected: true,
                    label: '${widget.chipLabelOf(item)} ×',
                    onTap: () => widget.onRemove(item),
                  ),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 90, maxWidth: 280),
                  child: IntrinsicWidth(
                    child: TextField(
                      controller: controller,
                      focusNode: focus,
                      onChanged: runSearch,
                      style: AppTextStyles.inputStrong,
                      cursorColor: AppColors.tealBright,
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration.collapsed(hintText: widget.hint, hintStyle: AppTextStyles.inputHint),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (focus.hasFocus && results.isNotEmpty) ...[
            const SizedBox(height: 6),
            SuggestionList<T>(
              items: results,
              query: controller.text,
              titleOf: widget.titleOf,
              trailingOf: widget.trailingOf,
              onTap: _pick,
            ),
          ],
        ],
      );
}

/// Dropdown with up to 5 suggestions; first one highlighted.
class SuggestionList<T> extends StatelessWidget {
  const SuggestionList({
    super.key,
    required this.items,
    required this.query,
    required this.titleOf,
    required this.onTap,
    this.trailingOf,
    this.maxItems = 5,
  });

  final List<T> items;
  final String query;
  final String Function(T) titleOf;
  final String Function(T)? trailingOf;
  final ValueChanged<T> onTap;
  final int maxItems;

  @override
  Widget build(BuildContext context) {
    final visible = items.take(maxItems).toList();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppDimens.radiusInput),
        border: Border.all(color: AppColors.borderSegment),
        boxShadow: const [BoxShadow(color: AppColors.dropdownShadow, offset: Offset(0, 8), blurRadius: 20)],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < visible.length; i++) ...[
            if (i > 0) const ColoredBox(color: AppColors.divider, child: SizedBox(height: 1, width: double.infinity)),
            Material(
              color: i == 0 ? AppColors.tealSoft : AppColors.surface,
              child: InkWell(
                onTap: () => onTap(visible[i]),
                child: Container(
                  height: AppDimens.dropdownItemHeight - 1,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      Expanded(child: HighlightedText(text: titleOf(visible[i]), query: query)),
                      if (trailingOf != null)
                        Text(trailingOf!(visible[i]), style: AppTextStyles.caption.copyWith(color: AppColors.textHint)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Bold teal for the part that matches [query] (accent-insensitive).
class HighlightedText extends StatelessWidget {
  const HighlightedText({super.key, required this.text, required this.query});

  final String text;
  final String query;

  @override
  Widget build(BuildContext context) {
    final q = TextNormalizer.normalize(query);
    // Normalization maps 1 char -> 1 char, so indexes are valid on the original text.
    final start = q.isEmpty ? -1 : TextNormalizer.normalize(text).indexOf(q);
    if (start < 0 || start + q.length > text.length) {
      return Text(text, style: AppTextStyles.dropdownRest, maxLines: 1, overflow: TextOverflow.ellipsis);
    }
    final end = start + q.length;
    return Text.rich(
      TextSpan(children: [
        TextSpan(text: text.substring(0, start), style: AppTextStyles.dropdownRest),
        TextSpan(text: text.substring(start, end), style: AppTextStyles.dropdownMatch),
        TextSpan(text: text.substring(end), style: AppTextStyles.dropdownRest),
      ]),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
