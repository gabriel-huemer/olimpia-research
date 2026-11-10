import 'package:flutter/material.dart';

import '../../resources/app_dimens.dart';
import '../../resources/app_text_styles.dart';

/// Section/page title (800/22 navy) + subtitle (400/13).
class PageHeading extends StatelessWidget {
  const PageHeading({super.key, required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: AppDimens.headingTop, bottom: AppDimens.headingBottom),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: AppTextStyles.pageTitle),
            const SizedBox(height: 4),
            Text(subtitle, style: AppTextStyles.pageSubtitle),
          ],
        ),
      );
}
