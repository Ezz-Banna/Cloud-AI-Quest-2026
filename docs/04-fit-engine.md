# Bridgecom university fit engine

Status: built and tested on 2026-10-09. Code: `src/lib/engines/programs.ts`, `src/lib/data/*`, `src/lib/ai/modules.ts`, `src/app/discover/results`, `src/app/compare`.

The engine gives each student a personal, explained shortlist of university programs. It does not rank universities against each other, it never presents a fit score as a chance of admission, and it never fills a gap in the data with a guess.

## 1. Data architecture

### Institution level vs program level
| Level | Fields | Where |
|---|---|---|
| Institution (`University`) | name EN/AR, type, city and campuses, website, accreditation status and source, institution-wide mandatory fees, exchange programs, research highlights, verified achievements, accessibility facilities, transport and accommodation notes | `data/verified/universities.json`, table `universities` + `university_facts`, `university_campuses`, `extra_fees` |
| Program (`Program`) | field, degree, credit hours, tuition per credit hour (with track and year), program fees, minimum average to apply (year, track), past competitive cut-offs, eligible streams, study plan URL, curriculum topics, practical training, program accreditation, published graduate outcomes, verified achievements, career tags | `data/verified/programs.json`, tables `programs`, `program_fees`, `admission_rules`, `program_topics`, `extra_fees` |

Every record carries `sources[]` (URL, title, date checked) and `verification` (verified, partial, unverified, synthetic). Lists of facts (achievements, facilities, exchange programs) each carry their own source URL. There is no ranking field anywhere in the schema.

Seed format: `data/verified/SCHEMA.md`. Postgres version: `db/schema.sql`.

### Completeness
`src/lib/data/record-completeness.ts` lists the fields that matter for each record and reports a percentage and the missing items. It is shown on the About the data page and in the admin record list.

## 2. Data collection, import and audit

**Source priority:** Ministry of Higher Education and Scientific Research, the Unified Admission Coordination Unit, the Accreditation and Quality Assurance Commission (HEAC), official university sites, official study plans, official fee and admission publications. News sites and aggregators are not used as sources.

**What this build holds (2026-10-09):** 11 universities and 44 programs in 8 fields. Six programs have their official study plan read (curriculum topics and practical training): PSUT Computer Science and Software Engineering, JUST Artificial Intelligence and Nursing, ZUJ Computer Science, HU Software Engineering. No record has a checked accreditation status, extra mandatory fees, or past competitive cut-offs yet. These are shown as missing and excluded from scoring. **This is a sample, not national coverage.**

**Retrieval limits met:** the build container cannot reach university sites directly. Research ran through web search and fetch tools. Some official pages refused automated fetching: UJ fee pages, and Mutah's competitive cut-off PDF (blocked by robots.txt). The Unified Admission Unit's historical cut-off lists were not fetched. Those values stay empty until a person collects them.

**Pipeline:**
1. **Collect.** A data maintainer finds the official page or PDF and records the values with the URL and date.
2. **Normalise.** Record the values as JSON using the schema above. Topic ids come from `CURRICULUM_TOPICS`. Fees are in JOD with their track and year.
3. **Read study plans.** In Admin › Edit records, paste a study plan into "Read a study plan into curriculum topics". The AI, or keyword rules when offline, proposes topics. Each proposed topic must quote a course title found in the pasted text, or it is dropped. The maintainer reviews the proposals and saves.
4. **Import.** In Admin › Import, each row is validated with Zod (`src/lib/data/schemas.ts`). Every program needs a source. Numbers outside valid ranges are rejected, and a dry run shows the report first.
5. **Detect conflicts.** When an imported row disagrees with the verified seed on tuition, credit hours or the minimum average (`CONFLICT_FIELDS` in `repo.ts`), the record gets a `conflicts` entry. The engine treats each disputed fact as unknown, so the cost becomes "sources disagree" and eligibility becomes "unknown". The admin Provenance tab lists both values with their sources.
6. **Resolve.** Saving an admin edit records the decision and clears the conflict. "Verified" is kept only when the record has a dated source.
7. **Audit.** The Provenance tab flags records with no source, undated sources, sources older than 180 days, missing key fields, and conflicts.

## 3. Eligibility rules (`checkEligibility`)

| Status | Group | Rule |
|---|---|---|
| meets-published-minimum | eligible | student average ≥ the program's published minimum to apply |
| below-published-minimum | ineligible | student average < that minimum |
| stream-mismatch | ineligible | the program lists eligible streams and the student's stream is not among them |
| minimum-not-verified | unknown | no published minimum stored |
| conflicting-sources | unknown | sources disagree on the minimum |
| missing-student-average | unknown | the student has not given an average |

The minimum to apply is not the competitive cut-off. Past competitive cut-offs, when stored, are shown as "history only, not a prediction". A student above the minimum but below the latest cut-off gets that stated as a trade-off. Eligibility is never decided or reworded by the language model.

## 4. Ranking algorithm (`scoreProgram`, `rankPrograms`)

Each criterion c gives a sub-score s_c from 0 to 1. When the program record or the student profile lacks what the criterion needs, s_c is null and the criterion is left out.

| Criterion | Score |
|---|---|
| interest | 1 if the field is one the student picked, 0.5 if it is a related field, 0 otherwise |
| curriculum | share of the study plan's topics that match topics the student enjoys (from subjects, strengths, hobbies and achievements), capped at 1 after 3 matches |
| career | 1 if the field's usual career tags appear in the student's careers or industries, else 0 (a usual route, not an outcome) |
| affordability | within budget: 0.3 + 0.7 × headroom, where headroom = 1 − cost/budget. Over budget: max(0, 0.25 − overrun share) |
| location | 1 if any campus is in a preferred city. Otherwise 0.35, or 0 if the student will not relocate |
| type | 1 if public or private matches the stated preference, else 0 |
| applied | 1 if the study plan has published practical training |

**Weights** w_c run from 0 to 5. The defaults are interest 3, curriculum 2, career 3, affordability 2, location 2, type 0 (2 when the student has a preference), and applied 1 (3 for hands-on learners). The student's top three ranked priorities raise their criteria by +3, +2 and +1, up to a maximum of 5. The sliders on the results page then set any weight directly, and 0 removes a criterion.

```
fit        = 100 × Σ w·s / Σ w        over criteria with data
coverage   = Σ w (with data) / Σ w (all criteria with weight > 0)
rank_score = fit × coverage + 50 × (1 − coverage)
order      = eligible, then unknown, then ineligible; within a group by rank_score
```

For ordering only, a criterion without data counts as halfway (50), so missing data neither helps nor hurts a program. The card shows the fit, its coverage ("based on 83% of what matters to you"), and a factor table where each line's points add up to the fit.

**Strengths** are criteria scoring 0.7 or more, plus sourced achievements. **Trade-offs** are criteria scoring below 0.3, the amount over budget, a campus outside the student's preferred cities, being below a past cut-off, and partly verified data. **Alternatives** come from rules over the dataset:
- the same field where the student is eligible;
- a related field where the student is eligible;
- the same field within budget;
- the same field in a preferred city.

**Follow-up questions** (`followUps`) are asked only when the missing answer would separate the top six results. Examples: the student has no average and those programs have different minimums; the results span several fields; the yearly cost varies by more than 30%; the programs are in different cities. At most three are asked.

## 5. AI analysis

| Task | Function | Grounding and guard | Offline fallback |
|---|---|---|---|
| Read conversational answers (EN/AR) into a profile (fields, subjects, careers, budget, cities, learning style) | `interpretProfile` | Zod enums; the average must appear in the answers; the prompt forbids inferring sensitive characteristics or narrowing options by who the student is; the student reviews every field | keyword rules, `fallbackProfile` |
| Map ambitions to fields of study | same (`interests` enum) | fixed field ids only | keywords |
| Interpret program descriptions (study plans) | `extractCurriculum` | each topic needs a course title quoted from the pasted text; an admin reviews before saving | keywords |
| Explain a recommendation | `explainMatch` | sees only engine facts; every number must be in the facts and every reason code must exist, else a template is used | `templateExplanation` |
| Compare options | `compareOptions` | the same number check, program ids must be the chosen ones, and it never picks for the student | `templateComparison` |
| Follow-up questions | `followUps` (rules) plus the AI's `clarifications` | asked only when they change the top results | rules |
| Alternatives when requirements are not met | `addAlternatives` (rules) | only programs in the dataset that the student is eligible for | n/a |

Tuition, accreditation, achievements, rankings and admission outcomes never come from the model. Every call logs metadata (module, mode, latency, items dropped by validation) to the admin AI review tab.

## 6. API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/profile` | answers → profile draft |
| POST | `/api/match/programs` | profile (with optional `fit_weights`) → ranked matches, follow-up questions, criteria and weights |
| POST | `/api/ai/explain` | profile + program id → plain-language explanation |
| POST | `/api/ai/compare` | profile + 2-4 program ids → plain-language comparison |
| POST | `/api/admin/curriculum` | (admin) study plan text → topics with quotes |
| POST | `/api/data/import` | (admin) validated import with dry run |
| GET | `/api/admin/overview` | (admin) records, completeness, provenance issues, conflicts, AI log |
| POST/DELETE | `/api/admin/record` | (admin) save or revert a record edit |

## 7. Interface

The results page (`/discover/results`) has:
- priority sliders that re-rank as they move;
- follow-up questions;
- filters for my fields, meets the minimum, and within budget.

Each program card shows:
- university and program;
- eligibility with year, track and past cut-off;
- fit and coverage, with the note that it is not a chance of admission;
- cost with its basis, fee year and date checked;
- why it fits, trade-offs, alternatives and missing data;
- a factor table and sources;
- a plain-language explanation on request.

`/compare` shows up to four saved programs side by side, adds strengths, trade-offs, other fees, practical training, the study plan and past cut-off, and can write a plain-language comparison on request. Both pages work in Arabic with RTL.

## 8. Tests

`tests/fit-scenarios.test.ts` covers the requested scenarios with clearly illustrative fixtures:
1. A strong academic match.
2. A low-budget student.
3. Uncertain career plans.
4. Ambitious goals with limited admission options (plus the past cut-off shown as history).
5. Missing tuition.
6. Missing accreditation.
7. Conflicting source records.
8. A non-eligible program.
9. Arabic-language answers.
10. Conflicting student preferences.

Every scenario runs `assertConsistent`, which checks that:
- factor points sum to the fit;
- criteria without data contribute 0;
- every listed reason matches its factor's points;
- `rank_score` follows the formula;
- the ranking is ordered by group, then score;
- no text calls the fit a chance or a probability.

Further tests check that weights override defaults and that a student's name never changes the ranking. `tests/ai-modules.test.ts` checks the comparison and study-plan guards with mocked model output. The browser test (`scripts/e2e.mjs`) moves a priority slider and checks that the ranking updates, and runs the plain-language comparison.

## 9. Known limits

- The dataset is a sample of 11 institutions and 44 programs. Accreditation, extra fees and historical cut-offs are not collected yet.
- The 50-point default for criteria without data is a design choice for ordering. It is shown to students as "based on X% of what matters to you".
- Career alignment uses field-level career tags. It shows a usual route and makes no employment claim.
- The live AI path has not been run with an API key in this environment. All AI behaviour above is tested with mocked model output and offline rules.
