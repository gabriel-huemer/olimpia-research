import 'package:flutter/material.dart';

import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../../../core/widgets/status/warning_alert.dart';
import '../../../domain/entities/questionnaire.dart';
import '../presenter/survey_section_presenter.dart';
import '../view/survey_section_view.dart';
import 'question_controls.dart';

/// Alert with "Corrigir" / "Manter e sinalizar" bound to the presenter.
class RuleAlert extends StatelessWidget {
  const RuleAlert({super.key, required this.alert, required this.presenter});

  final AlertViewModel alert;
  final SurveySectionPresenter presenter;

  @override
  Widget build(BuildContext context) => WarningAlert(
        title: alert.title,
        message: alert.message,
        kept: alert.kept,
        onCorrect: () => presenter.correct(alert.ruleId),
        onKeep: () => presenter.keepAndFlag(alert.ruleId),
      );
}

/// Form card: groups the questions of one `card` id of the seed.
class QuestionCard extends StatelessWidget {
  const QuestionCard({super.key, required this.card, required this.presenter});

  final CardViewModel card;
  final SurveySectionPresenter presenter;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[
      if (card.conditionalNote != null) ...[
        Text(card.conditionalNote!, style: AppTextStyles.conditionalNote),
        const SizedBox(height: 6),
      ],
      if (card.title != null) ...[Text(card.title!, style: AppTextStyles.questionTitle), const SizedBox(height: 6)],
    ];
    final qs = card.questions;
    for (var i = 0; i < qs.length; i++) {
      final q = qs[i];
      final prevRow = i > 0 && qs[i - 1].question.labelStyle == LabelStyle.row;
      final isRow = q.question.labelStyle == LabelStyle.row && q.question.type != QuestionType.nights;
      if (i > 0) {
        children.add(prevRow && isRow
            ? const ColoredBox(color: AppColors.divider, child: SizedBox(height: 1))
            : const SizedBox(height: 14));
      }
      // Two consecutive dates side by side (Figma "Estadia").
      if (q.question.type == QuestionType.date && i + 1 < qs.length && qs[i + 1].question.type == QuestionType.date) {
        children.add(Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _QuestionBlock(vm: q, presenter: presenter)),
            const SizedBox(width: 10),
            Expanded(child: _QuestionBlock(vm: qs[i + 1], presenter: presenter)),
          ],
        ));
        i++;
        continue;
      }
      children.add(_QuestionBlock(vm: q, presenter: presenter));
    }
    final content = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children);
    return card.conditionalNote != null ? AppCard.conditional(child: content) : AppCard(child: content);
  }
}

/// Label (title/caps) + hint + control + inline alerts.
class _QuestionBlock extends StatelessWidget {
  const _QuestionBlock({required this.vm, required this.presenter});

  final QuestionViewModel vm;
  final SurveySectionPresenter presenter;

  @override
  Widget build(BuildContext context) {
    final q = vm.question;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        switch (q.labelStyle) {
          LabelStyle.title => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(q.label, style: AppTextStyles.questionTitle),
            ),
          LabelStyle.caps => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(q.label.toUpperCase(), style: AppTextStyles.capsLabel),
            ),
          LabelStyle.row => const SizedBox.shrink(),
        },
        if (vm.hint != null && vm.hint!.isNotEmpty) ...[
          Transform.translate(offset: const Offset(0, -6), child: Text(vm.hint!, style: AppTextStyles.caption)),
          const SizedBox(height: 4),
        ],
        QuestionControl(vm: vm, presenter: presenter),
        for (final a in vm.alerts) ...[const SizedBox(height: 10), RuleAlert(alert: a, presenter: presenter)],
      ],
    );
  }
}

/// Rating card of sections 7 and 8 (Figma "rate": r12, 13px padding, ✓ when answered).
class RatingCard extends StatelessWidget {
  const RatingCard({super.key, required this.vm, required this.presenter});

  final QuestionViewModel vm;
  final SurveySectionPresenter presenter;

  @override
  Widget build(BuildContext context) => AppCard(
        radius: AppDimens.radiusRateCard,
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Text(vm.question.label, style: AppTextStyles.rowTitle)),
                if (vm.isAnswered) const AnsweredCheck(),
              ],
            ),
            const SizedBox(height: 9),
            QuestionControl(vm: vm, presenter: presenter),
          ],
        ),
      );
}
