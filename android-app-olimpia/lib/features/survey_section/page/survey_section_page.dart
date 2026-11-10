import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/buttons/app_buttons.dart';
import '../../../core/widgets/inputs/oto_text_field.dart';
import '../../../core/widgets/layout/app_bars.dart';
import '../../../core/widgets/layout/bottom_action_bar.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../../core/widgets/layout/page_heading.dart';
import '../../../domain/entities/questionnaire.dart';
import '../presenter/survey_section_presenter.dart';
import '../view/survey_section_view.dart';
import '../widgets/question_card.dart';

/// 03–12: the same page renders the 10 sections from the SQLite questionnaire.
class SurveySectionPage extends StatefulWidget {
  const SurveySectionPage({super.key, required this.args});

  final SectionArgs args;

  @override
  State<SurveySectionPage> createState() => _SurveySectionPageState();
}

class _SurveySectionPageState extends State<SurveySectionPage>
    with PresenterState<SurveySectionPage, SurveySectionPresenter, SurveySectionView, SectionViewModel>
    implements SurveySectionView {
  final _cardKeys = <String, GlobalKey>{};

  @override
  SurveySectionPresenter createPresenter() => sl<SurveySectionPresenter>(param1: widget.args);

  GlobalKey _keyFor(String cardId) => _cardKeys.putIfAbsent(cardId, GlobalKey.new);

  @override
  void openSection(SectionArgs args) => AppRoutes.openSection(context, args);

  @override
  void openReview(String surveyId) => AppRoutes.openReview(context, surveyId);

  @override
  void close() => Navigator.of(context).pop();

  @override
  void backToHome() => AppRoutes.backToHome(context);

  @override
  Future<void> askLeave() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.leaveTitle, style: AppTextStyles.appBarTitle),
        content: Text(AppStrings.leaveBody, style: AppTextStyles.body14),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.leaveCancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text(AppStrings.leaveConfirm)),
        ],
      ),
    );
    if (leave == true) presenter.leaveConfirmed();
  }

  @override
  void scrollTo(String questionKey) {
    final card = viewModel?.cards.where((c) => c.questions.any((q) => q.key == questionKey)).firstOrNull;
    final ctx = card == null ? null : _cardKeys[card.id]?.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 300), alignment: 0.1);
  }

  @override
  Widget build(BuildContext context) {
    final vm = viewModel;
    if (vm == null) return const OtoScaffold(body: Center(child: CircularProgressIndicator()));
    return OtoScaffold(
      onBack: presenter.back,
      topBar: SectionAppBar(
        protocol: vm.protocol,
        current: vm.number,
        total: vm.total,
        online: vm.online,
        onBack: presenter.back,
      ),
      bottomBar: BottomActionBar(onBack: presenter.back, primaryLabel: vm.primaryLabel, onPrimary: presenter.next),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppDimens.pagePadding, 0, AppDimens.pagePadding, 24),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          children: [
            PageHeading(title: vm.title, subtitle: vm.subtitle),
            if (vm.searchPlaceholder != null) ...[
              OtoTextField(text: '', hint: vm.searchPlaceholder, onChanged: presenter.search),
              const SizedBox(height: 10),
            ],
            for (final card in vm.cards) ..._card(vm, card),
            if (vm.bulkLabel != null) OutlineLinkButton(label: vm.bulkLabel!, onPressed: presenter.fillRemaining),
          ],
        ),
      ),
    );
  }

  List<Widget> _card(SectionViewModel vm, CardViewModel card) {
    final ratings = vm.layout == SectionLayout.ratings;
    return [
      KeyedSubtree(
        key: _keyFor(card.id),
        child: ratings
            ? RatingCard(vm: card.questions.first, presenter: presenter)
            : QuestionCard(card: card, presenter: presenter),
      ),
      if (card.footnote != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
          child: Text(card.footnote!, style: AppTextStyles.caption, textAlign: TextAlign.center),
        ),
      for (final a in card.alertsAfter) ...[
        const SizedBox(height: AppDimens.cardGap),
        RuleAlert(alert: a, presenter: presenter),
      ],
      SizedBox(height: ratings ? 10 : AppDimens.cardGap),
    ];
  }
}
