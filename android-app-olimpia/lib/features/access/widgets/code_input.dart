import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_text_styles.dart';

/// Six boxes for the researcher code (Figma 49x56, r10). One hidden field captures the typing.
class CodeInput extends StatefulWidget {
  const CodeInput({
    super.key,
    required this.length,
    required this.value,
    required this.onChanged,
    required this.onSubmitted,
    this.hasError = false,
  });

  final int length;
  final String value;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;
  final bool hasError;

  @override
  State<CodeInput> createState() => _CodeInputState();
}

class _CodeInputState extends State<CodeInput> {
  late final _controller = TextEditingController(text: widget.value);
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(CodeInput old) {
    super.didUpdateWidget(old);
    if (_controller.text != widget.value) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: _focus.requestFocus,
        child: Stack(
          children: [
            // Invisible field that owns the keyboard.
            Opacity(
              opacity: 0,
              child: SizedBox(
                height: AppDimens.codeBoxHeight,
                child: TextField(
                  controller: _controller,
                  focusNode: _focus,
                  autofocus: false,
                  showCursor: false,
                  enableInteractiveSelection: false,
                  textCapitalization: TextCapitalization.characters,
                  keyboardType: TextInputType.visiblePassword,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
                    LengthLimitingTextInputFormatter(widget.length),
                  ],
                  onChanged: widget.onChanged,
                  onSubmitted: (_) => widget.onSubmitted(),
                ),
              ),
            ),
            Row(
              children: [
                for (var i = 0; i < widget.length; i++) ...[
                  if (i > 0) const SizedBox(width: AppDimens.codeBoxGap),
                  Expanded(child: _box(i)),
                ],
              ],
            ),
          ],
        ),
      );

  Widget _box(int i) {
    final char = i < widget.value.length ? widget.value[i] : '';
    final isCurrent = _focus.hasFocus && i == widget.value.length.clamp(0, widget.length - 1);
    final border = widget.hasError
        ? AppColors.danger
        : char.isNotEmpty || isCurrent
            ? AppColors.teal
            : AppColors.borderInput;
    return Container(
      height: AppDimens.codeBoxHeight,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppDimens.radiusInput),
        border: Border.all(color: border),
        boxShadow: isCurrent ? const [BoxShadow(color: AppColors.tealFocusRing, spreadRadius: 3)] : null,
      ),
      child: Text(char, style: AppTextStyles.codeDigit),
    );
  }
}
