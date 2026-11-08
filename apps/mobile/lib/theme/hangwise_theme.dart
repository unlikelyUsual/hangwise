import 'package:flutter/material.dart';

const hangwisePaper = Color(0xFFF4F1EA);
const hangwiseInk = Color(0xFF1C2421);
const hangwiseTeal = Color(0xFF0E6E67);
const hangwiseTealSoft = Color(0xFFE5F3F1);
const hangwiseDemo = Color(0xFF6B4E16);
const hangwiseDemoWash = Color(0xFFF6E7C1);

final hangwiseTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: hangwiseTeal,
    primary: hangwiseTeal,
    surface: hangwisePaper,
    onSurface: hangwiseInk,
  ),
  scaffoldBackgroundColor: hangwisePaper,
  appBarTheme: const AppBarTheme(
    backgroundColor: hangwisePaper,
    foregroundColor: hangwiseInk,
    elevation: 0,
    centerTitle: false,
  ),
  navigationBarTheme: const NavigationBarThemeData(
    backgroundColor: Color(0xFFFBF9F4),
    indicatorColor: hangwiseTealSoft,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE4DDD2))),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: hangwiseTeal,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
);
