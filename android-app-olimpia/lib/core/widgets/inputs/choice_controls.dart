import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_text_styles.dart';
import '../layout/oto_scaffold.dart';

/// Generic choice item: keeps controls independent from domain entities.
class ChoiceItem<T> {
  const ChoiceItem({required this.value, required this.label, this.tone = ChoiceTone.neutral});

  final T value;
  final String label;
  final ChoiceTone tone;
}

/// Selected colors of segmented buttons (Figma "sg g", "sg y", "sg r", "sg n").
enum ChoiceTone {
  neutral(AppColors.teal, AppColors.surface),
  positive(AppColors.success, AppColors.surface),
  warning(AppColors.warningStrong, AppColors.warningTitle),
  negative(AppColors.danger, AppColors.surface),
  muted(AppColors.textSecondary, AppColors.surface);

  const ChoiceTone(this.fill, this.text);

  final Color fill;
  final Color text;
}

// ---------------------------------------------------------------- chips

/// Pill chip (Figma "chip" / "chip sel").
class OtoChip extends StatelessWidget {
  const OtoChip({super.key, required this.label, required this.selected, required this.onTap, this.compact = false});

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  /// 28px chip used inside inputs ("Caldas Novas, GO ×").
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final height = compact ? 28.0 : AppDimens.chipHeight;
    return Material(
      color: selected ? AppColors.teal : AppColors.surface,
      shape: StadiumBorder(side: BorderSide(color: selected ? AppColors.teal : AppColors.borderInput)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: height,
          padding: EdgeInsets.symmetric(horizontal: compact ? 11 : AppDimens.chipPaddingH),
          alignment: Alignment.center,
          child: Text(label, style: selected ? AppTextStyles.chipSelected : AppTextStyles.chip),
        ),
      ),
    );
  }
}

/// Wrap of chips for single or multiple selection.
class ChipGroup<T> extends StatelessWidget {
  const ChipGroup({super.key, required this.items, required this.isSelected, required this.onTap});

  final List<ChoiceItem<T>> items;
  final bool Function(T value) isSelected;
  final ValueChanged<T> onTap;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: AppDimens.chipSpacing,
        runSpacing: AppDimens.chipSpacing,
        children: [
          for (final item in items)
            OtoChip(label: item.label, selected: isSelected(item.value), onTap: () => onTap(item.value)),
        ],
      );
}

// ---------------------------------------------------------------- radio

class RadioDot extends StatelessWidget {
  const RadioDot({super.key, required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: AppDimens.radioSize,
        height: AppDimens.radioSize,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: selected ? AppColors.teal : AppColors.radioIdle, width: 2),
        ),
        child: selected
            ? Container(
                width: AppDimens.radioDot,
                height: AppDimens.radioDot,
                decoration: const BoxDecoration(color: AppColors.teal, shape: BoxShape.circle),
              )
            : null,
      );
}

/// One radio row (also used alone, e.g. "Reside no exterior").
class RadioRow extends StatelessWidget {
  const RadioRow({super.key, required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppDimens.radioRowHeight - 1),
          child: Row(
            children: [
              RadioDot(selected: selected),
              const SizedBox(width: 10),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(label, style: AppTextStyles.body14),
                ),
              ),
            ],
          ),
        ),
      );
}

/// Vertical radio list with dividers (Figma "radio" rows).
class RadioList<T> extends StatelessWidget {
  const RadioList({super.key, required this.items, required this.selected, required this.onSelect});

  final List<ChoiceItem<T>> items;
  final T? selected;
  final ValueChanged<T> onSelect;

  @override
  Widget build(BuildContext context) => DividedColumn(
        children: [
          for (final item in items)
            RadioRow(label: item.label, selected: item.value == selected, onTap: () => onSelect(item.value)),
        ],
      );
}

// ---------------------------------------------------------------- segmented

class SegmentButton extends StatelessWidget {
  const SegmentButton({
    super.key,
    required this.label,
    required this.selected,
    required this.tone,
    required this.onTap,
    this.width,
  });

  final String label;
  final bool selected;
  final ChoiceTone tone;
  final VoidCallback onTap;
  final double? width;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? tone.fill : AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusSegment),
          side: BorderSide(color: selected ? tone.fill : AppColors.borderSegment),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            width: width,
            height: AppDimens.segmentHeight,
            padding: const EdgeInsets.symmetric(horizontal: 3),
            alignment: Alignment.center,
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              style: AppTextStyles.segment.copyWith(color: selected ? tone.text : AppColors.textSecondary),
            ),
          ),
        ),
      );
}

/// Row of segments. [expand] = fill the width (ratings), otherwise fixed 57px buttons.
class SegmentedChoice<T> extends StatelessWidget {
  const SegmentedChoice({
    super.key,
    required this.items,
    required this.selected,
    required this.onSelect,
    this.expand = true,
  });

  final List<ChoiceItem<T>> items;
  final T? selected;
  final ValueChanged<T> onSelect;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    Widget button(ChoiceItem<T> item) => SegmentButton(
          label: item.label,
          tone: item.tone,
          selected: item.value == selected,
          width: expand ? null : AppDimens.segmentWidthCompact,
          onTap: () => onSelect(item.value),
        );
    return Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(width: AppDimens.segmentGap),
          expand ? Expanded(child: button(items[i])) : button(items[i]),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------- 0..10 scale

/// 0–10 selector. [backgroundOf] colors the idle cells (NPS detractor/neutral/promoter).
class ScaleSelector extends StatelessWidget {
  const ScaleSelector({
    super.key,
    required this.min,
    required this.max,
    required this.selected,
    required this.onSelect,
    required this.backgroundOf,
    this.minLabel,
    this.maxLabel,
  });

  final int min;
  final int max;
  final int? selected;
  final ValueChanged<int> onSelect;
  final Color Function(int value) backgroundOf;
  final String? minLabel;
  final String? maxLabel;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              for (var v = min; v <= max; v++) ...[
                if (v > min) const SizedBox(width: 3.95),
                Expanded(
                  child: Material(
                    color: v == selected ? AppColors.teal : backgroundOf(v),
                    borderRadius: BorderRadius.circular(AppDimens.radiusScale),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => onSelect(v),
                      child: SizedBox(
                        height: AppDimens.scaleHeight,
                        child: Center(
                          child: Text(
                            '$v',
                            style: AppTextStyles.scaleNumber
                                .copyWith(color: v == selected ? AppColors.surface : AppColors.textChip),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (minLabel != null || maxLabel != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Text(minLabel ?? '', style: AppTextStyles.caption),
                const Spacer(),
                Text(maxLabel ?? '', style: AppTextStyles.caption),
              ],
            ),
          ],
        ],
      );
}

// ---------------------------------------------------------------- stepper

/// Label + "−  N  +" (Figma "sb" / "sb p").
class CounterRow extends StatelessWidget {
  const CounterRow({super.key, required this.label, required this.value, required this.onChanged, this.min = 0});

  final String label;
  final int value;
  final int min;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: AppDimens.counterRowHeight - 1,
        child: Row(
          children: [
            Expanded(child: Text(label, style: AppTextStyles.body14)),
            _StepButton(sign: '−', filled: false, onTap: value > min ? () => onChanged(value - 1) : null),
            SizedBox(width: 42, child: Text('$value', textAlign: TextAlign.center, style: AppTextStyles.stepperValue)),
            _StepButton(sign: '+', filled: true, onTap: () => onChanged(value + 1)),
          ],
        ),
      );
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.sign, required this.filled, required this.onTap});

  final String sign;
  final bool filled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: filled ? AppColors.teal : AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.radiusSegment),
          side: BorderSide(color: filled ? AppColors.teal : AppColors.borderInput),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox.square(
            dimension: AppDimens.stepperSize,
            child: Center(
              child: Text(
                sign,
                style: AppTextStyles.stepperSign.copyWith(
                  color: filled
                      ? AppColors.surface
                      : onTap == null
                          ? AppColors.radioIdle
                          : AppColors.navy,
                ),
              ),
            ),
          ),
        ),
      );
}
