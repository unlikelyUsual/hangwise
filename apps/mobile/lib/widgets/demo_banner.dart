import 'package:flutter/material.dart';
import 'package:hangwise/theme/hangwise_theme.dart';

class DemoBanner extends StatelessWidget {
  const DemoBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return const Material(
      color: hangwiseDemoWash,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Text(
          'DEMO · fictional adults · payments off · a failed request is not replaced with sample people',
          style: TextStyle(color: hangwiseDemo, fontSize: 12, height: 1.35, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
