import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/buttons/app_buttons.dart';
import '../../../core/widgets/layout/app_bars.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../common/widgets/survey_rows_card.dart';
import '../presenter/home_presenter.dart';
import '../view/home_view.dart';
import '../widgets/home_widgets.dart';

/// 02 Início.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage>
    with PresenterState<HomePage, HomePresenter, HomeView, HomeViewModel>
    implements HomeView {
  @override
  HomePresenter createPresenter() => sl<HomePresenter>();

  @override
  void openSection(SectionArgs args) => AppRoutes.openSection(context, args);

  @override
  void openSync() => AppRoutes.openSync(context);

  @override
  void openAccess() => AppRoutes.openAccess(context);

  @override
  Widget build(BuildContext context) {
    final vm = viewModel;
    if (vm == null) return const OtoScaffold(body: SizedBox.shrink());
    return OtoScaffold(
      topBar: GreetingAppBar(name: vm.name, details: vm.details, online: vm.online),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppDimens.pagePadding, 18, AppDimens.pagePadding, 24),
        children: [
          SyncQueueCard(count: vm.queued, hint: vm.syncHint, onViewQueue: presenter.viewQueue),
          const SizedBox(height: AppDimens.cardGap),
          PrimaryButton(label: AppStrings.newSurvey, large: true, loading: vm.starting, onPressed: presenter.newSurvey),
          const SizedBox(height: AppDimens.cardGap),
          Row(
            children: [
              Expanded(
                child: StatCard(label: AppStrings.today, value: '${vm.todayCount}', caption: AppStrings.collected),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatCard(
                  label: AppStrings.withAlert,
                  value: '${vm.alertCount}',
                  caption: AppStrings.suspiciousData,
                  valueColor: AppColors.warningBorder,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimens.cardGap),
          vm.rows.isEmpty
              ? AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppStrings.todayCollections, style: AppTextStyles.cardTitle),
                      const SizedBox(height: 12),
                      Text(AppStrings.noCollectionsToday, style: AppTextStyles.caption),
                    ],
                  ),
                )
              : SurveyRowsCard(title: AppStrings.todayCollections, rows: vm.rows),
        ],
      ),
    );
  }
}
