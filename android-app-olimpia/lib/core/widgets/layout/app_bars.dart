import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_strings.dart';
import '../../resources/app_text_styles.dart';
import '../buttons/app_buttons.dart';
import '../status/status_badges.dart';
import 'institutional_stripe.dart';

/// "Nova pesquisa #0047": bold title + grey protocol.
class TitleWithProtocol extends StatelessWidget {
  const TitleWithProtocol({super.key, required this.title, this.protocol});

  final String title;
  final String? protocol;

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(text: title, style: AppTextStyles.appBarTitle),
        if (protocol != null)
          TextSpan(text: ' $protocol', style: AppTextStyles.appBarProtocol),
      ],
    ),
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
    textAlign: TextAlign.center,
  );
}

/// Shared top row: back button, centered title and connectivity pill.
class _TopRow extends StatelessWidget {
  const _TopRow({
    required this.title,
    required this.online,
    required this.onBack,
  });

  final Widget title;
  final bool online;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: AppDimens.backButtonSize,
    child: Stack(
      alignment: Alignment.center,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 66),
          child: title,
        ),
        if (onBack != null)
          Align(
            alignment: Alignment.centerLeft,
            child: BackCircleButton(onPressed: onBack!),
          ),
        Align(
          alignment: Alignment.centerRight,
          child: ConnectivityPill(online: online),
        ),
      ],
    ),
  );
}

/// 57px app bar (Revisão, Sincronização).
class SimpleAppBar extends StatelessWidget {
  const SimpleAppBar({
    super.key,
    required this.title,
    required this.online,
    this.protocol,
    this.onBack,
  });

  final String title;
  final String? protocol;
  final bool online;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) => Container(
    height: AppDimens.simpleAppBarHeight,
    padding: const EdgeInsets.fromLTRB(
      AppDimens.pagePadding,
      10,
      AppDimens.pagePadding,
      0,
    ),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.border)),
    ),
    alignment: Alignment.topCenter,
    child: _TopRow(
      title: TitleWithProtocol(title: title, protocol: protocol),
      online: online,
      onBack: onBack,
    ),
  );
}

/// 96px app bar of the survey sections, with "Seção N de 10" and progress.
class SectionAppBar extends StatelessWidget {
  const SectionAppBar({
    super.key,
    required this.protocol,
    required this.current,
    required this.total,
    required this.online,
    required this.onBack,
  });

  final String protocol;
  final int current;
  final int total;
  final bool online;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Container(
    height: AppDimens.sectionAppBarHeight,
    padding: const EdgeInsets.fromLTRB(
      AppDimens.pagePadding,
      10,
      AppDimens.pagePadding,
      0,
    ),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.border)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TopRow(
          title: TitleWithProtocol(
            title: AppStrings.newSurveyTitle,
            protocol: protocol,
          ),
          online: online,
          onBack: onBack,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Flexible(
              child: Text.rich(
                TextSpan(
                  style: AppTextStyles.captionMedium,
                  children: [
                    const TextSpan(text: '${AppStrings.section} '),
                    TextSpan(
                      text: '$current',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.teal,
                      ),
                    ),
                    TextSpan(text: ' ${AppStrings.of10} $total'),
                  ],
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                AppStrings.savedOnDevice,
                style: AppTextStyles.captionMedium,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ProgressTrack(value: current / total),
      ],
    ),
  );
}

/// 6px rounded progress bar.
class ProgressTrack extends StatelessWidget {
  const ProgressTrack({
    super.key,
    required this.value,
    this.trackColor = AppColors.border,
    this.fillColor = AppColors.tealBright,
  });

  final double value;
  final Color trackColor;
  final Color fillColor;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(AppDimens.progressHeight / 2),
    child: SizedBox(
      height: AppDimens.progressHeight,
      child: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: trackColor)),
          FractionallySizedBox(
            widthFactor: value.clamp(0, 1).toDouble(),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: fillColor,
                borderRadius: BorderRadius.circular(
                  AppDimens.progressHeight / 2,
                ),
              ),
              child: const SizedBox.expand(),
            ),
          ),
        ],
      ),
    ),
  );
}

/// 79px greeting bar of the home screen, with the institutional stripe at the bottom.
class GreetingAppBar extends StatelessWidget {
  const GreetingAppBar({
    super.key,
    required this.name,
    required this.details,
    required this.online,
  });

  final String name;
  final String details;
  final bool online;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: AppDimens.homeAppBarHeight,
    child: Column(
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppDimens.pagePadding,
              10,
              AppDimens.pagePadding,
              0,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppStrings.greeting, style: AppTextStyles.caption),
                      Text(
                        name,
                        style: AppTextStyles.greetingName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        details,
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 14.5),
                  child: ConnectivityPill(online: online),
                ),
              ],
            ),
          ),
        ),
        const InstitutionalStripe(),
      ],
    ),
  );
}
