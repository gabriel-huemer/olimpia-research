import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/buttons/app_buttons.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/layout/bottom_action_bar.dart';
import '../../../core/widgets/layout/list_row.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../presenter/saved_presenter.dart';
import '../view/saved_view.dart';

/// 14 Pesquisa salva.
class SavedPage extends StatefulWidget {
  const SavedPage({super.key, required this.surveyId});

  final String surveyId;

  @override
  State<SavedPage> createState() => _SavedPageState();
}

class _SavedPageState extends State<SavedPage>
    with PresenterState<SavedPage, SavedPresenter, SavedView, SavedViewModel>
    implements SavedView {
  @override
  SavedPresenter createPresenter() => sl<SavedPresenter>(param1: widget.surveyId);

  @override
  void openSection(SectionArgs args) => AppRoutes.openSection(context, args, replaceStack: true);

  @override
  void openHome() => AppRoutes.backToHome(context);

  @override
  Widget build(BuildContext context) {
    final vm = viewModel;
    if (vm == null) return const OtoScaffold(body: SizedBox.shrink());
    final (a, b, c) = vm.online
        ? (AppStrings.savedOnlineA, AppStrings.savedOnlineB, AppStrings.savedOnlineC)
        : (AppStrings.savedOfflineA, AppStrings.savedOfflineB, AppStrings.savedOfflineC);
    return OtoScaffold(
      topBarColor: AppColors.background,
      onBack: presenter.backHome,
      bottomBar: BottomBarContainer(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            PrimaryButton(label: AppStrings.newSurvey, loading: vm.starting, onPressed: presenter.newSurvey),
            const SizedBox(height: 8),
            TextLinkButton(label: AppStrings.backHome, onPressed: presenter.backHome),
          ],
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 30),
          child: Column(
            children: [
              Container(
                width: 96,
                height: 96,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: AppColors.successSoft, shape: BoxShape.circle),
                child: Container(
                  width: 64,
                  height: 64,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                  child: Text('✓', style: AppTextStyles.bigCounter.copyWith(fontSize: 34)),
                ),
              ),
              const SizedBox(height: 14),
              Text(AppStrings.savedTitle(vm.protocol), style: AppTextStyles.successTitle, textAlign: TextAlign.center),
              const SizedBox(height: 15),
              Text.rich(
                TextSpan(children: [
                  TextSpan(text: a, style: AppTextStyles.body15),
                  TextSpan(text: b, style: AppTextStyles.body15Bold),
                  TextSpan(text: c, style: AppTextStyles.body15),
                ]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              AppCard(
                padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 3),
                child: ListRow(
                  title: AppStrings.inQueue(vm.queued),
                  subtitle: AppStrings.noDataLost,
                  trailing: vm.queued > 0
                      ? const StatusTag(label: AppStrings.tagPending, tone: TagTone.pending)
                      : const StatusTag(label: AppStrings.tagSynced, tone: TagTone.success),
                ),
              ),
              const SizedBox(height: AppDimens.cardGap),
            ],
          ),
        ),
      ),
    );
  }
}
