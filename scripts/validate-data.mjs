// Data validation for data/verified/*.json. Run: npm run validate:data (writes tests/results/data-validation.json).
// Errors fail the run; warnings are listed for review. The same checks run in tests/data-validation.test.ts.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (f) => JSON.parse(readFileSync(join(ROOT, "data/verified", `${f}.json`), "utf8"));

// Plausible JOD per credit hour by fee track. Outside these ranges a value is probably a typo, a semester total,
// or a different currency, so it is an error until someone re-reads the source.
const FEE_RANGE = { competitive: [5, 250], parallel: [20, 400], private: [20, 400], international: [20, 600] };
const SECONDARY = /wikipedia\.org|jordantimes\.com|jordannews\.jo|royanews\.tv|alrai\.com|alghad\.com|khaberni\.com|jo24\.net|hala\.jo|almamlakatv\.com|petra\.gov\.jo/i;
const norm = (s) => String(s ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

export function validateData({ universities, programs, scholarships }, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const warnings = [];
  const e = (dataset, id, check, msg) => errors.push({ dataset, id, check, msg });
  const w = (dataset, id, check, msg) => warnings.push({ dataset, id, check, msg });

  const dupIds = (rows, ds) => {
    const seen = new Set();
    for (const r of rows) { if (seen.has(r.id)) e(ds, r.id, "duplicate-id", "id used twice"); seen.add(r.id); }
  };
  dupIds(universities, "universities"); dupIds(programs, "programs"); dupIds(scholarships, "scholarships");

  const uniNames = new Map();
  for (const u of universities) {
    const k = norm(u.name_en);
    if (uniNames.has(k)) e("universities", u.id, "duplicate-university", `same name as ${uniNames.get(k)}`);
    uniNames.set(k, u.id);
    if (!u.sources?.length) e("universities", u.id, "missing-source", "no source");
    else if (u.sources.every((s) => SECONDARY.test(s.url))) w("universities", u.id, "secondary-source-only", "type/location backed only by a secondary source");
    if (!u.website) w("universities", u.id, "missing-website", "no official website");
  }

  const byUni = new Set(universities.map((u) => u.id));
  const progKeys = new Map();
  for (const p of programs) {
    if (!byUni.has(p.university_id)) e("programs", p.id, "unknown-university", p.university_id);
    const k = `${p.university_id}|${norm(p.name_en)}`;
    if (progKeys.has(k)) e("programs", p.id, "duplicate-program", `same program as ${progKeys.get(k)}`);
    progKeys.set(k, p.id);
    if (!p.sources?.length || p.sources.some((s) => !/^https:\/\//.test(s.url))) e("programs", p.id, "missing-source", "missing or non-https source URL");
    const fee = p.tuition_jod_per_credit_hour;
    if (fee != null) {
      if (!Number.isFinite(fee) || fee <= 0) e("programs", p.id, "invalid-fee", `fee ${fee}`);
      const [lo, hi] = FEE_RANGE[p.tuition_track] ?? [5, 600];
      if (fee < lo || fee > hi) e("programs", p.id, "implausible-fee", `${fee} JOD per credit hour is outside ${lo}-${hi} for track ${p.tuition_track ?? "unknown"} (wrong currency or a semester total?)`);
      if (!p.tuition_track) e("programs", p.id, "missing-fee-track", "fee without a fee track (regular, parallel, private...)");
      if (!p.tuition_year) w("programs", p.id, "missing-fee-year", "fee shown without an academic year");
    }
    if (p.min_admission_avg != null && !p.min_admission_year) w("programs", p.id, "missing-minimum-year", "minimum average without an academic year");
    if (p.min_admission_avg != null && (p.min_admission_avg < 50 || p.min_admission_avg > 100)) e("programs", p.id, "invalid-minimum", `${p.min_admission_avg}`);
    if (p.credit_hours != null && (p.credit_hours < 100 || p.credit_hours > 300)) e("programs", p.id, "implausible-credit-hours", `${p.credit_hours}`);
    if (p.credit_hours != null && fee != null) {
      const total = p.credit_hours * fee;
      if (total < 1500 || total > 80000) e("programs", p.id, "implausible-total", `tuition total ${total} JOD`);
    }
    for (const t of p.historical_thresholds ?? []) {
      if (t.kind === "minimum-to-apply" && p.min_admission_avg != null && t.year === p.min_admission_year && t.value !== p.min_admission_avg)
        e("programs", p.id, "contradictory-minimum", `stored minimum ${p.min_admission_avg} vs threshold ${t.value} (${t.year})`);
    }
    for (const c of p.conflicts ?? []) w("programs", p.id, "recorded-conflict", `${c.field}: sources disagree (value withheld)`);
    if (p.verification === "verified" && (fee == null || p.credit_hours == null || p.min_admission_avg == null))
      e("programs", p.id, "verified-but-incomplete", "marked verified while fee, credit hours or minimum is missing");
  }

  // The same university, field and fee track should not carry two different fees in the same year.
  const feeGroups = new Map();
  for (const p of programs) {
    if (p.tuition_jod_per_credit_hour == null) continue;
    const k = `${p.university_id}|${norm(p.name_en)}|${p.tuition_track}|${p.tuition_year}`;
    const prev = feeGroups.get(k);
    if (prev && prev.fee !== p.tuition_jod_per_credit_hour) e("programs", p.id, "contradictory-fee", `${p.tuition_jod_per_credit_hour} vs ${prev.fee} in ${prev.id}`);
    feeGroups.set(k, { fee: p.tuition_jod_per_credit_hour, id: p.id });
  }

  for (const s of scholarships) {
    if (!/^https:\/\//.test(s.url ?? "")) e("scholarships", s.id, "missing-source", "missing or non-https official URL");
    if (!s.sources?.length) e("scholarships", s.id, "missing-source", "no source");
    const a = s.availability;
    if (!a) { e("scholarships", s.id, "missing-status", "no availability status"); continue; }
    if (a.status === "open" && !a.closes) e("scholarships", s.id, "open-without-deadline", "marked open without a published closing date");
    if ((a.status === "open" || a.status === "announced") && a.closes && a.closes < today) e("scholarships", s.id, "outdated-deadline", `marked ${a.status} but closed on ${a.closes}`);
    if (a.status === "open" && a.opens && a.opens > today) e("scholarships", s.id, "not-yet-open", `marked open but opens ${a.opens}`);
    if (a.opens && a.closes && a.opens > a.closes) e("scholarships", s.id, "invalid-window", `${a.opens} after ${a.closes}`);
    if (!a.academic_year && a.status !== "unverified" && a.status !== "historical") w("scholarships", s.id, "missing-academic-year", "status without an academic year");
    if (s.sources?.length && s.sources.every((x) => SECONDARY.test(x.url))) w("scholarships", s.id, "secondary-source-only", "backed only by news coverage");
  }
  return { checked_on: today, errors, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = validateData({ universities: load("universities"), programs: load("programs"), scholarships: load("scholarships") });
  mkdirSync(join(ROOT, "tests/results"), { recursive: true });
  writeFileSync(join(ROOT, "tests/results/data-validation.json"), JSON.stringify(r, null, 2) + "\n");
  for (const x of r.errors) console.log(`ERROR  ${x.dataset}/${x.id}  ${x.check}: ${x.msg}`);
  for (const x of r.warnings) console.log(`warn   ${x.dataset}/${x.id}  ${x.check}: ${x.msg}`);
  console.log(`${r.errors.length} errors, ${r.warnings.length} warnings`);
  process.exit(r.errors.length ? 1 : 0);
}
