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
