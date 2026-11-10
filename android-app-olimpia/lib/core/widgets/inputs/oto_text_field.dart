import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_text_styles.dart';

enum InputBoxState { idle, focused, warning }

/// Visual box of every input (Figma "input", "input focus", "input warn").
class OtoInputBox extends StatelessWidget {
  const OtoInputBox({
    super.key,
    required this.child,
    this.state = InputBoxState.idle,
    this.height = AppDimens.inputHeight,
    this.padding = const EdgeInsets.symmetric(horizontal: 13),
  });

  final Widget child;
  final InputBoxState state;

  /// null = grows with content (text area, chips).
  final double? height;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final (bg, border) = switch (state) {
      InputBoxState.idle => (AppColors.surface, AppColors.borderInput),
      InputBoxState.focused => (AppColors.surface, AppColors.teal),
      InputBoxState.warning => (AppColors.warningInput, AppColors.warning),
    };
    return AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      height: height,
      constraints: const BoxConstraints(minHeight: AppDimens.inputHeight),
      padding: padding,
      alignment: Alignment.centerLeft,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppDimens.radiusInput),
        border: Border.all(color: border),
        boxShadow: state == InputBoxState.focused
            ? const [BoxShadow(color: AppColors.tealFocusRing, spreadRadius: 3)]
            : null,
      ),
      child: child,
    );
  }
}

/// Single-line text input with optional prefix ("R$"), suffix ("anos") and ✓.
class OtoTextField extends StatefulWidget {
  const OtoTextField({
    super.key,
    required this.text,
    required this.onChanged,
    this.hint,
    this.keyboardType,
    this.inputFormatters,
    this.prefixText,
    this.suffixText,
    this.warning = false,
    this.showCheck = false,
    this.focusNode,
    this.onSubmitted,
  });

  final String text;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;
  final String? hint;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? prefixText;
  final String? suffixText;
  final bool warning;
  final bool showCheck;
  final FocusNode? focusNode;

  @override
  State<OtoTextField> createState() => _OtoTextFieldState();
}

class _OtoTextFieldState extends State<OtoTextField> {
  late final TextEditingController _controller = TextEditingController(text: widget.text);
  FocusNode? _ownFocus;

  FocusNode get _focus => widget.focusNode ?? (_ownFocus ??= FocusNode());

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
  }

  void _onFocus() => setState(() {});

  @override
  void didUpdateWidget(OtoTextField old) {
    super.didUpdateWidget(old);
    if (old.focusNode != widget.focusNode) {
      (old.focusNode ?? _ownFocus)?.removeListener(_onFocus);
      _focus.addListener(_onFocus);
    }
    // External changes (e.g. "Corrigir" clears the value) win when the field is not being edited.
    if (widget.text != _controller.text && !_focus.hasFocus) _controller.text = widget.text;
  }

  @override
  void dispose() {
    _focus.removeListener(_onFocus);
    _ownFocus?.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OtoInputBox(
        state: widget.warning
            ? InputBoxState.warning
            : _focus.hasFocus
                ? InputBoxState.focused
                : InputBoxState.idle,
        child: Row(
          children: [
            if (widget.prefixText != null) ...[
              Text(widget.prefixText!, style: AppTextStyles.caption),
              const SizedBox(width: 7),
            ],
            Expanded(
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                onChanged: widget.onChanged,
                onSubmitted: widget.onSubmitted,
                keyboardType: widget.keyboardType,
                inputFormatters: widget.inputFormatters,
                style: AppTextStyles.inputStrong,
                cursorColor: AppColors.tealBright,
                cursorWidth: 2,
                decoration: InputDecoration.collapsed(hintText: widget.hint, hintStyle: AppTextStyles.inputHint),
              ),
            ),
            if (widget.suffixText != null) Text(widget.suffixText!, style: AppTextStyles.caption),
            if (widget.showCheck) Text('✓', style: AppTextStyles.inputCheck),
          ],
        ),
      );
}

/// Multi-line answer with "52/500" counter.
class TextAreaField extends StatefulWidget {
  const TextAreaField({super.key, required this.text, required this.onChanged, required this.maxLength, this.hint});

  final String text;
  final ValueChanged<String> onChanged;
  final int maxLength;
  final String? hint;

  @override
  State<TextAreaField> createState() => _TextAreaFieldState();
}

class _TextAreaFieldState extends State<TextAreaField> {
  late final TextEditingController _controller = TextEditingController(text: widget.text);
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OtoInputBox(
        height: null,
        state: _focus.hasFocus ? InputBoxState.focused : InputBoxState.idle,
        padding: const EdgeInsets.fromLTRB(13, 12, 13, 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            TextField(
              controller: _controller,
              focusNode: _focus,
              minLines: 3,
              maxLines: 6,
              maxLength: widget.maxLength,
              maxLengthEnforcement: MaxLengthEnforcement.enforced,
              onChanged: (v) {
                setState(() {});
                widget.onChanged(v);
              },
              style: AppTextStyles.textArea,
              cursorColor: AppColors.tealBright,
              decoration: InputDecoration.collapsed(
                hintText: widget.hint,
                hintStyle: AppTextStyles.textArea.copyWith(color: AppColors.textHint),
              ).copyWith(counterText: ''),
            ),
            Text('${_controller.text.length}/${widget.maxLength}', style: AppTextStyles.counterHint),
          ],
        ),
      );
}
