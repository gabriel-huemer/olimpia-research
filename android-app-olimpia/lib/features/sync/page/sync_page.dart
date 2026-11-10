import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/widgets/layout/app_bars.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../common/widgets/survey_rows_card.dart';
import '../presenter/sync_presenter.dart';
import '../view/sync_view.dart';

/// 15 Sincronização.
class SyncPage extends StatefulWidget {
  const SyncPage({super.key});

  @override
  State<SyncPage> createState() => _SyncPageState();
}

class _SyncPageState extends State<SyncPage>
    with PresenterState<SyncPage, SyncPresenter, SyncView, SyncViewModel>
    implements SyncView {
  @override
  SyncPresenter createPresenter() => sl<SyncPresenter>();

  @override
  void close() => Navigator.of(context).pop();

  @override
  Widget build(BuildContext context) {
    final vm = viewModel;
    if (vm == null) return const OtoScaffold(body: Center(child: CircularProgressIndicator()));
    return OtoScaffold(
      topBar: SimpleAppBar(title: AppStrings.syncTitle, online: vm.online, onBack: presenter.back),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppDimens.pagePadding, 18, AppDimens.pagePadding, 24),
        children: [
          _SyncBanner(vm: vm, onRetry: presenter.retry),
          const SizedBox(height: 14),
          vm.rows.isEmpty
              ? AppCard(child: Text(AppStrings.syncEmpty, style: AppTextStyles.caption))
              : SurveyRowsCard(rows: vm.rows),
        ],
      ),
    );
  }
}

class _SyncBanner extends StatelessWidget {
  const _SyncBanner({required this.vm, required this.onRetry});

  final SyncViewModel vm;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final offline = vm.state == SyncBannerState.offline;
    final fg = offline ? AppColors.dangerDark : AppColors.successDark;
    final title = switch (vm.state) {
      SyncBannerState.offline => AppStrings.syncOffline,
      SyncBannerState.sending => AppStrings.syncSending,
      SyncBannerState.idle || SyncBannerState.error => AppStrings.syncIdle,
      SyncBannerState.done => AppStrings.syncDone,
    };
    final canRetry = vm.state == SyncBannerState.idle || vm.state == SyncBannerState.error;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: offline ? AppColors.dangerSoft : AppColors.successSoft,
        borderRadius: BorderRadius.circular(AppDimens.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: AppTextStyles.syncBannerTitle.copyWith(color: fg))),
              if (canRetry)
                GestureDetector(
                  onTap: onRetry,
                  child: Text(AppStrings.syncRetry, style: AppTextStyles.syncBannerCaption.copyWith(color: fg)),
                ),
            ],
          ),
          const SizedBox(height: 11),
          ProgressTrack(
            value: vm.total == 0 ? 1 : vm.sent / vm.total,
            trackColor: offline ? AppColors.npsDetractor : AppColors.successTrack,
            fillColor: offline ? AppColors.dangerDark : AppColors.success,
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(AppStrings.syncProgress(vm.sent, vm.total), style: AppTextStyles.syncBannerCaption.copyWith(color: fg)),
              const Spacer(),
              Text(AppStrings.batchesOf(vm.batchSize), style: AppTextStyles.syncBannerCaption.copyWith(color: fg)),
            ],
          ),
        ],
      ),
    );
  }
}
