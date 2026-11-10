import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/text_normalizer.dart';
import '../../../core/widgets/inputs/autocomplete_fields.dart';
import '../../../core/widgets/inputs/choice_controls.dart';
import '../../../core/widgets/inputs/date_field.dart';
import '../../../core/widgets/inputs/oto_text_field.dart';
import '../../../domain/entities/city.dart';
import '../../../domain/entities/questionnaire.dart';
import '../presenter/survey_section_presenter.dart';
import '../view/survey_section_view.dart';

/// Maps seed option tones to control tones.
ChoiceTone toneOf(OptionTone t) => switch (t) {
      OptionTone.neutral => ChoiceTone.neutral,
      OptionTone.positive => ChoiceTone.positive,
      OptionTone.warning => ChoiceTone.warning,
      OptionTone.negative => ChoiceTone.negative,
      OptionTone.muted => ChoiceTone.muted,
    };

List<ChoiceItem<String>> choiceItems(Question q) =>
    [for (final o in q.options) ChoiceItem(value: o.value, label: o.label, tone: toneOf(o.tone))];

/// Builds the input control of one question (factory: one place knows every type).
class QuestionControl extends StatelessWidget {
  const QuestionControl({super.key, required this.vm, required this.presenter});

  final QuestionViewModel vm;
  final SurveySectionPresenter presenter;

  Question get q => vm.question;

  void _set(Object? value) => presenter.setAnswer(q.key, value);

  @override
  Widget build(BuildContext context) => switch (q.type) {
        QuestionType.single => _single(),
        QuestionType.multi => ChipGroup<String>(
            items: choiceItems(q),
            isSelected: (v) => (vm.value as List?)?.contains(v) ?? false,
            onTap: (v) => presenter.toggleOption(q.key, v),
          ),
        QuestionType.rating => SegmentedChoice<String>(items: choiceItems(q), selected: vm.value as String?, onSelect: _set),
        QuestionType.state => _StateControl(vm: vm, onChanged: _set),
        QuestionType.city => AutocompleteField<City>(
            key: ValueKey('city-${vm.ufFilter}'),
            selectedText: City.fromAnswer(vm.value)?.name,
            hint: q.placeholder,
            search: (text) => presenter.searchCities(text, vm.ufFilter),
            titleOf: (c) => c.name,
            trailingOf: (c) => c.uf,
            onSelected: (c) => _set(c.toAnswer()),
          ),
        QuestionType.cityMulti => MultiAutocompleteField<City>(
            selected: [for (final c in (vm.value as List?) ?? const []) ?City.fromAnswer(c)],
            hint: q.placeholder,
            search: (text) => presenter.searchCities(text, null),
            titleOf: (c) => c.name,
            chipLabelOf: (c) => '$c',
            trailingOf: (c) => c.uf,
            onAdd: (c) => presenter.addCity(q.key, c),
            onRemove: (c) => presenter.removeCity(q.key, c),
          ),
        QuestionType.date => DateField(
            value: Formatters.parseIsoDate(vm.value),
            onChanged: (d) => _set(Formatters.isoDate(d)),
          ),
        QuestionType.nights => _NightsControl(vm: vm, onDayUse: presenter.setDayUse),
        QuestionType.counter => CounterRow(
            label: q.label,
            min: q.min ?? 0,
            value: (vm.value as num?)?.toInt() ?? (q.min ?? 0),
            onChanged: _set,
          ),
        QuestionType.scale => ScaleSelector(
            min: q.min ?? 0,
            max: q.max ?? 10,
            selected: (vm.value as num?)?.toInt(),
            onSelect: _set,
            minLabel: q.minLabel,
            maxLabel: q.maxLabel,
            backgroundOf: q.scaleVariant == ScaleVariant.nps ? _npsColor : (_) => AppColors.divider,
          ),
        QuestionType.text => TextAreaField(
            text: (vm.value as String?) ?? '',
            maxLength: q.maxLength ?? 500,
            hint: q.placeholder,
            onChanged: _set,
          ),
        QuestionType.integer => OtoTextField(
            text: vm.value == null ? '' : '${vm.value}',
            hint: q.placeholder,
            suffixText: q.suffix,
            warning: vm.hasWarning,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
            onChanged: (t) => _set(int.tryParse(t)),
          ),
        QuestionType.currency => OtoTextField(
            text: vm.value is num ? Formatters.money(vm.value! as num) : '',
            hint: q.placeholder,
            prefixText: 'R\$',
            warning: vm.hasWarning,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')), LengthLimitingTextInputFormatter(12)],
            onChanged: (t) => _set(Formatters.parseMoney(t)),
          ),
      };

  Widget _single() {
    final items = choiceItems(q);
    final selected = vm.value as String?;
    return switch (q.display) {
      ChoiceDisplay.radio => RadioList<String>(items: items, selected: selected, onSelect: _set),
      ChoiceDisplay.chips => ChipGroup<String>(
          items: items,
          isSelected: (v) => v == selected,
          onTap: (v) => _set(v == selected ? null : v),
        ),
      ChoiceDisplay.segmented => q.labelStyle == LabelStyle.row
          ? SizedBox(
              height: AppDimens.inlineRowHeight - 1,
              child: Row(
                children: [
                  Expanded(child: Text(q.label, style: AppTextStyles.body14)),
                  SegmentedChoice<String>(items: items, selected: selected, onSelect: _set, expand: false),
                ],
              ),
            )
          : SegmentedChoice<String>(items: items, selected: selected, onSelect: _set),
    };
  }

  static Color _npsColor(int v) => v <= 6
      ? AppColors.npsDetractor
      : v <= 8
          ? AppColors.npsNeutral
          : AppColors.npsPromoter;
}

/// State autocomplete (local list of the seed) + "Reside no exterior".
class _StateControl extends StatelessWidget {
  const _StateControl({required this.vm, required this.onChanged});

  final QuestionViewModel vm;
  final ValueChanged<Object?> onChanged;

  @override
  Widget build(BuildContext context) {
    final q = vm.question;
    final abroad = q.exteriorValue != null && vm.value == q.exteriorValue;
    final selected = abroad ? null : q.optionFor('${vm.value}');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AutocompleteField<QuestionOption>(
          selectedText: selected?.label,
          hint: 'Digite o estado…',
          search: (text) async {
            final n = TextNormalizer.normalize(text);
            return q.options
                .where((o) => TextNormalizer.normalize(o.label).contains(n) || o.uf?.toLowerCase() == n)
                .toList();
          },
          titleOf: (o) => o.label,
          onSelected: (o) => onChanged(o.value),
        ),
        if (q.exteriorValue != null) ...[
          const SizedBox(height: 10),
          RadioRow(
            label: q.exteriorLabel ?? q.exteriorValue!,
            selected: abroad,
            onTap: () => onChanged(abroad ? null : q.exteriorValue),
          ),
        ],
      ],
    );
  }
}

/// "Pernoites (calculado automaticamente)  3" + "Day use".
class _NightsControl extends StatelessWidget {
  const _NightsControl({required this.vm, required this.onDayUse});

  final QuestionViewModel vm;
  final ValueChanged<bool> onDayUse;

  @override
  Widget build(BuildContext context) {
    final nights = (vm.value as num?)?.toInt();
    final dayUse = nights == 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          height: 41,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: vm.hasWarning ? AppColors.warningInput : AppColors.tealSoft,
            borderRadius: BorderRadius.circular(AppDimens.radiusInput),
            border: vm.hasWarning ? Border.all(color: AppColors.warning) : null,
          ),
          child: Row(
            children: [
              Expanded(child: Text(vm.question.label, style: AppTextStyles.body13.copyWith(color: AppColors.navy))),
              Text(nights == null ? '–' : '$nights', style: AppTextStyles.stepperSign),
            ],
          ),
        ),
        if (vm.question.dayUseLabel != null) ...[
          const SizedBox(height: 6),
          RadioRow(label: vm.question.dayUseLabel!, selected: dayUse, onTap: () => onDayUse(!dayUse)),
        ],
      ],
    );
  }
}
