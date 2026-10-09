// Jordanian context statistics shown on the homepage and "How Bridgecom works". Every entry was opened and checked
// at its source on the verification date; see docs/07-statistics-sources.md for the full register.
// Rules: national figures only, no animation, never presented as an outcome of Bridgecom.
export interface JordanStat {
  id: string;
  value: string;
  label_en: string;
  label_ar: string;
  period_en: string;
  period_ar: string;
  source_en: string;
  source_ar: string;
  url: string;
  verified_at: string;
  home?: boolean;
}

export const JORDAN_STATS: JordanStat[] = [
  {
    id: "neet-15-24", home: true, value: "29.4%",
    label_en: "of young people aged 15–24 in Jordan were not in education, employment or training",
    label_ar: "من الشباب في الأردن بعمر 15–24 لم يكونوا في تعليم أو عمل أو تدريب",
    period_en: "2024, down from 38.1% in 2017. Share of all young people.", period_ar: "2024، بعد أن كانت 38.1% في 2017. نسبة من جميع الشباب.",
    source_en: "World Bank (ILO data from the DoS labour force survey)", source_ar: "البنك الدولي (بيانات منظمة العمل الدولية من مسح دائرة الإحصاءات العامة)",
    url: "https://data.worldbank.org/indicator/SL.UEM.NEET.ZS?locations=JO", verified_at: "2026-10-09",
  },
  {
    id: "youth-unemployment", value: "39.3%",
    label_en: "unemployment rate among people aged 15–24 in Jordan's labour force",
    label_ar: "معدل البطالة بين من هم في سوق العمل بعمر 15–24 في الأردن",
    period_en: "2024. Share of young people who are working or looking for work, not of all young people.", period_ar: "2024. نسبة من الشباب العاملين أو الباحثين عن عمل، لا من جميع الشباب.",
    source_en: "World Bank, national estimate (DoS labour force survey)", source_ar: "البنك الدولي، تقدير وطني (مسح دائرة الإحصاءات العامة)",
    url: "https://data.worldbank.org/indicator/SL.UEM.1524.NE.ZS?locations=JO", verified_at: "2026-10-09",
  },
  {
    id: "advanced-education", value: "26.6%",
    label_en: "unemployment rate among people with advanced (post-secondary) education in Jordan's labour force",
    label_ar: "معدل البطالة بين من لديهم تعليم متقدم (بعد الثانوي) في سوق العمل الأردني",
    period_en: "2023, all ages 15+. Not a rate for recent graduates.", period_ar: "2023، جميع الأعمار 15+. ليس معدلاً للخريجين الجدد.",
    source_en: "World Bank (ILO data from the DoS labour force survey)", source_ar: "البنك الدولي (بيانات منظمة العمل الدولية من مسح دائرة الإحصاءات العامة)",
    url: "https://data.worldbank.org/indicator/SL.UEM.ADVN.ZS?locations=JO", verified_at: "2026-10-09",
  },
  {
    id: "jordanians-q2-2026", value: "21.0%",
    label_en: "unemployment rate among Jordanians aged 15 and over",
    label_ar: "معدل البطالة بين الأردنيين بعمر 15 سنة فأكثر",
    period_en: "Q2 2026 (April–June), published 7 September 2026. All ages, not youth.", period_ar: "الربع الثاني 2026 (نيسان–حزيران)، نُشر في أيلول 2026. جميع الأعمار، لا الشباب فقط.",
    source_en: "Department of Statistics, Employment and Unemployment Survey", source_ar: "دائرة الإحصاءات العامة، مسح العمالة والبطالة",
    url: "https://dosweb.dos.gov.jo/unemp_092026/", verified_at: "2026-10-09",
  },
];
