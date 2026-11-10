import 'package:flutter/material.dart';

import '../../../core/di/injector.dart';
import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_assets.dart';
import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/resources/app_theme.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/buttons/app_buttons.dart';
import '../../../core/widgets/layout/institutional_stripe.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../presenter/access_presenter.dart';
import '../view/access_view.dart';
import '../widgets/code_input.dart';

/// 01 Acesso.
class AccessPage extends StatefulWidget {
  const AccessPage({super.key});

  @override
  State<AccessPage> createState() => _AccessPageState();
}

class _AccessPageState extends State<AccessPage>
    with
        PresenterState<AccessPage, AccessPresenter, AccessView, AccessViewModel>
    implements AccessView {
  @override
  AccessPresenter createPresenter() => sl<AccessPresenter>();

  @override
  void openHome() => AppRoutes.openHome(context);

  @override
  Widget build(BuildContext context) {
    final vm = viewModel ?? const AccessViewModel(code: '');
    return OtoScaffold(
      statusBar: AppTheme.darkStatusBar,
      topBarColor: AppColors.navy,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Hero(),
            Transform.translate(
              offset: const Offset(0, -AppDimens.radiusSheet * 2),
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(AppDimens.radiusSheet),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(
                  AppDimens.accessPadding,
                  43,
                  AppDimens.accessPadding,
                  24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppStrings.loginTitle,
                      style: AppTextStyles.sheetTitle,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      AppStrings.loginDescription,
                      style: AppTextStyles.pageSubtitle,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      AppStrings.loginCodeLabel,
                      style: AppTextStyles.capsLabel,
                    ),
                    const SizedBox(height: 6),
                    CodeInput(
                      length: AccessPresenter.codeLength,
                      value: vm.code,
                      hasError: vm.error != null,
                      onChanged: presenter.onCodeChanged,
                      onSubmitted: presenter.submit,
                    ),
                    if (vm.error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        vm.error!,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.danger,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: AppStrings.loginButton,
                      loading: vm.loading,
                      onPressed: vm.canSubmit ? presenter.submit : null,
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        AppStrings.loginHelp,
                        style: AppTextStyles.caption,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.navy,
    // Figma: 330px; grows with large system fonts instead of overflowing.
    constraints: const BoxConstraints(minHeight: 330),
    padding: const EdgeInsets.only(bottom: AppDimens.radiusSheet * 2 + 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const InstitutionalStripe(height: 5),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppDimens.accessPadding,
            21,
            AppDimens.accessPadding,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 150,
                height: 72,
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppDimens.radiusCard),
                ),
                child: Image.asset(AppAssets.logoOto, fit: BoxFit.contain),
              ),
              const SizedBox(height: 30),
              Text(AppStrings.heroTitle, style: AppTextStyles.heroTitle),
              const SizedBox(height: 17),
              Text(AppStrings.heroSubtitle, style: AppTextStyles.heroSubtitle),
              const SizedBox(height: 15),
              Text(
                AppStrings.heroInstitution,
                style: AppTextStyles.heroInstitution,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
