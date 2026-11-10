import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/layout/app_bars.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/layout/bottom_action_bar.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../../core/widgets/layout/page_heading.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../../../core/widgets/status/warning_alert.dart';
import '../presenter/review_presenter.dart';
import '../view/review_view.dart';

/// 13 Revisão antes de salvar.
class ReviewPage extends StatefulWidget {
  const ReviewPage({super.key, required this.surveyId});

  final String surveyId;

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage>
    with PresenterState<ReviewPage, ReviewPresenter, ReviewView, ReviewViewModel>
    implements ReviewView {
  @override
  ReviewPresenter createPresenter() => sl<ReviewPresenter>(param1: widget.surveyId);

  @override
  void openSection(SectionArgs args) => AppRoutes.openSection(context, args);

  @override
  void openSaved(String surveyId) => AppRoutes.openSaved(context, surveyId);

  @override
  void close() => Navigator.of(context).pop();

  @override
  Widget build(BuildContext context) {
    final vm = viewModel;
    if (vm == null) return const OtoScaffold(body: Center(child: CircularProgressIndicator()));
    return OtoScaffold(
      topBar: SimpleAppBar(title: AppStrings.reviewTitle, protocol: vm.protocol, online: vm.online, onBack: presenter.back),
      bottomBar: BottomActionBar(
        onBack: presenter.back,
        primaryLabel: AppStrings.saveSurvey,
        loading: vm.saving,
        onPrimary: presenter.save,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppDimens.pagePadding, 0, AppDimens.pagePadding, 24),
        children: [
          const PageHeading(title: AppStrings.reviewHeading, subtitle: AppStrings.reviewSubtitle),
          if (vm.flagCount > 0) ...[
            WarningAlert(title: AppStrings.flaggedCount(vm.flagCount), message: AppStrings.flaggedBody),
            const SizedBox(height: 14),
          ],
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 4),
            child: Column(
              children: [
                for (var i = 0; i < vm.rows.length; i++) ...[
                  if (i > 0) const Divider(height: 1, thickness: 1, color: Color(0xFFEEF1F6)),
                  _ReviewRow(row: vm.rows[i], onTap: () => presenter.editSection(vm.rows[i].sectionId)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text.rich(
            TextSpan(style: AppTextStyles.captionLh, children: [
              const TextSpan(text: AppStrings.researcher),
              TextSpan(text: vm.researcherCode, style: const TextStyle(fontWeight: FontWeight.w700)),
              TextSpan(text: ' · ${AppStrings.start} ${vm.startTime} · ${AppStrings.end} ${vm.endTime}\n'),
              TextSpan(text: '${AppStrings.location}${vm.location}'),
            ]),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.row, required this.onTap});

  final ReviewRowViewModel row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: SizedBox(
          height: AppDimens.reviewRowHeight + 4,
          child: Row(
            children: [
              Expanded(child: Text(row.title, style: AppTextStyles.body14)),
              row.tag == null
                  ? const AnsweredCheck(large: true)
                  : StatusTag(label: row.tag!, tone: row.tone ?? TagTone.warning),
            ],
          ),
        ),
      );
}
