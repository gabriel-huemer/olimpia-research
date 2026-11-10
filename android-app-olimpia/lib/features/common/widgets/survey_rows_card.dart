import 'package:flutter/material.dart';

import '../../../core/resources/app_text_styles.dart';
import '../../../core/widgets/layout/app_card.dart';
import '../../../core/widgets/layout/list_row.dart';
import '../../../core/widgets/layout/oto_scaffold.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../mapper/survey_row_mapper.dart';

/// Card with a list of surveys and status tags (home and sync).
class SurveyRowsCard extends StatelessWidget {
  const SurveyRowsCard({super.key, required this.rows, this.title});

  final String? title;
  final List<SurveyRowViewModel> rows;

  @override
  Widget build(BuildContext context) => AppCard(
        padding: EdgeInsets.fromLTRB(15, title == null ? 0 : 15, 15, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null) ...[Text(title!, style: AppTextStyles.cardTitle), const SizedBox(height: 4)],
            DividedColumn(
              children: [
                for (final r in rows)
                  ListRow(title: r.title, subtitle: r.subtitle, trailing: StatusTag(label: r.tag, tone: r.tone)),
              ],
            ),
          ],
        ),
      );
}
