# Bridgecom verified-data schema (seed JSON)
Every record: `sources: [{url, title, checked_at:"YYYY-MM-DD"}]`, `verification: "verified" | "partial" | "unverified"`, `notes`.
Numeric facts not found on a fetched source page MUST be null (never estimated).

universities.json  [{id, name_en, name_ar, type:"public"|"private", city, governorate, website, accreditation_note, sources, verification, notes}]
programs.json      [{id, university_id, name_en, name_ar, field, degree, credit_hours, tuition_jod_per_credit_hour,
                    tuition_track:"competitive"|"parallel"|"private"|"international"|null, tuition_year,
                    min_admission_avg, min_admission_year, admission_track:"unified-competitive"|"private-university"|null,
                    eligible_streams:[...], internship_note, career_tags:[...], sources, verification, notes}]
scholarships.json  [{id, name_en, name_ar, provider, kind:"scholarship"|"grant"|"loan"|"sponsorship"|"program",
                    eligibility_text, criteria:{min_avg, need_based, fields:[...], nationality, stage:"pre-university"|"university"|"graduate"},
                    coverage_text, url, sources, verification, notes}]
courses.json       [{id, title, provider, url, language:"en"|"ar", cost:"free"|"paid"|"freemium", skills:[skill_id], level:"beginner"|"intermediate"|"advanced",
                    est_hours|null, prerequisite_skills:[skill_id], has_practical_project:bool, sources, verification, notes}]
skill ids (lowercase kebab): html, css, javascript, react, rest-api, git, typescript, nodejs, sql, python, data-analysis, machine-learning, ui-design, communication, english

## Fit-engine fields (added 2026-10-09, all optional; leave out or null when not published)
universities.json  + campuses:[city], accreditation_status:"listed"|"not-listed"|null, accreditation_source,
                     additional_fees:[{name, amount_jod, per:"semester"|"year"|"once", source_url}],
                     exchange_programs|research_highlights|verified_achievements|accessibility_facilities:[{text, source_url, checked_at}],
                     transport_note, accommodation_note
programs.json      + study_plan_url, curriculum_topics:[topic id, see CURRICULUM_TOPICS in src/lib/data/taxonomy.ts],
                     additional_fees:[...], historical_thresholds:[{year, kind:"minimum-to-apply"|"competitive-cutoff", value, track, source_url}],
                     accreditation_status, accreditation_source, graduate_outcomes_note, verified_achievements:[...]
Every program needs at least one source. Achievements, accessibility facilities and accreditation are never written by the AI.

## Accuracy-audit fields (added 2026-10-09)
universities.json  type may also be "special-law" (MoHE lists HTU and WISE as universities operating under a special law).
                   Directory-only entries (no programs yet) say so in notes.
programs.json      tuition_year / min_admission_year: the academic year the source states; "(from file name)" when only the file name gives it; null when not stated.
                   tuition_track uses the university's own term ("regular", "regular (inferred)", "private", ...).
scholarships.json  + availability:{status:"open"|"announced"|"closed"|"historical"|"unverified", academic_year, opens, closes (YYYY-MM-DD), checked_at, source_url},
                     documents:[...]. The engine re-checks status against today's date: an "open" with a past closing date is shown as closed,
                     and "open" without published dates is shown as unverified.
admission-rules.json  national minimums newer than a university's own list: {id, fields, sector, min_avg, from_year, text_en, text_ar, source_kind, sources}.
revisions.json     append-only log of every audit change: {date, dataset, id, field, old, new, reason, source_url}.
Checks: `npm run validate:data` (errors fail CI tests). Measured coverage and audit tables: `npm run audit:data`.
