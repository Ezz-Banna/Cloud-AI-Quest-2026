# Statistics source register

Every statistic shown in the interface (`src/lib/data/jordan-stats.ts`), the deck and the brochure. All were opened and read at the source on **2026-10-09**. They are national context figures; Bridgecom has not measured any effect on them.

| Value | What it measures | Population and scope | Reference period | Source (opened) | Where shown |
|---|---|---|---|---|---|
| **29.4%** | Youth NEET rate: share of **all** young people not in education, employment or training | Ages 15–24, Jordan | 2024 (38.1% in 2017) | World Bank `SL.UEM.NEET.ZS`, ILO data from the DoS Employment and Unemployment Survey. https://api.worldbank.org/v2/country/JOR/indicator/SL.UEM.NEET.ZS?format=json (page link: https://data.worldbank.org/indicator/SL.UEM.NEET.ZS?locations=JO). Value 29.39 | Homepage (only statistic), How it works, deck slide 2, brochure |
| **39.3%** | Youth unemployment rate: unemployed as a share of the **labour force** aged 15–24. Not the share of all young people, not a graduate rate | Ages 15–24 in the labour force, Jordan; probably Jordanians and non-Jordanians (inferred: ILO's all-ages rate matches DoS total-population level) | 2024 | World Bank `SL.UEM.1524.NE.ZS` (national estimate). Value 39.257 | How it works |
| **26.6%** | Unemployment rate among labour-force members with advanced (post-secondary) education. National, all ages; not recent graduates, not any one university | Ages 15+, Jordan | 2023 (2024 not published by World Bank) | World Bank `SL.UEM.ADVN.ZS`. Value 26.608 | How it works |
| **21.0%** | Unemployment rate among Jordanians (male and female) | Jordanians aged 15+ | Q2 2026 (April–June); published 7 Sep 2026 | Department of Statistics release "Unemployment Rate for Total Population Decreased to 16.1% in Q2 2026", https://dosweb.dos.gov.jo/unemp_092026/ — quote: "UERATE among Jordanian males and females decreased by 0.3 percentage points in Q2 2026 to reach 21.0%" | How it works |

Newer comparable releases checked: DoS Q2 2026 is the latest quarter. World Bank/ILO 2025 survey values for NEET and youth unemployment are not published (null); a 2025 ILO *modelled* youth estimate exists and was deliberately not used, to avoid mixing modelled and survey values.

Presentation rules followed: the 21.0% (Jordanians, all ages, quarterly) is never placed as if comparable with the 39.3% (ages 15–24, annual); each card states its own population and period.

## Removed or not used

- **16.1% "national unemployment, Q4 2025"** (deck slide 2, brochure): was cited via a newspaper, not the DoS release. Replaced with the verified 29.4% NEET figure.
- **ILO bachelor's-level (ISCED 6) unemployment 27.6% (2024)**: found by the research pass via the ILO SDMX API, but I could not re-open it myself, so it is not shown.
- **Higher-education gross enrolment 35.9% (2024, UNESCO UIS via World Bank)**: found but not re-opened; not shown.

## Research gaps

1. DoS 2026 releases do not publish a 15–24 or degree-holder unemployment rate (only "24+" and education shares of the unemployed).
2. No verified national tracer study of recent graduates' employment outcomes was found.
3. No credible national statistic on access to career guidance was found; nothing is shown on that topic.
4. MoHE statistics pages found were for 2022–2023 only; not used.
5. Deck and brochure figures **209,871** (Tawjihi candidates 2025, via Jordan News) and **480,009** (university students 2025/26) come from secondary sources and were not re-verified in this pass.
