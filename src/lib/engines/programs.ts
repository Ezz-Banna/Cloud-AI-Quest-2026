// Deterministic program matching. Eligibility is a rule check against stored, sourced minimums;
// suitability is a separate weighted score. The two are never merged into one number.
import type { LearnerProfile, Program, University } from "../types";
import { FIELD_BY_ID } from "../data/taxonomy";

export type EligibilityStatus =
  | "meets-published-minimum"
  | "below-published-minimum"
  | "stream-mismatch"
  | "minimum-not-verified"
  | "missing-student-average";

export interface Eligibility {
  status: EligibilityStatus;
  published_min?: number | null;
  year?: string | null;
  track?: string | null;
  margin?: number;
}

export interface Reason {
  code: string;
  weight: number; // contribution to suitability (can be negative)
  en: string;
  ar: string;
}

export interface CostEstimate {
  total_tuition_jod: number | null;
  per_year_jod: number | null;
  nominal_years: number;
  within_budget: boolean | null;
  basis: string;
}

export interface ProgramMatch {
  program: Program;
  university: University;
  eligibility: Eligibility;
  suitability: number; // 0-100
  reasons: Reason[];
  cost: CostEstimate;
  missing_data: string[];
}

export function checkEligibility(p: LearnerProfile, prog: Program): Eligibility {
  const min = prog.min_admission_avg ?? null;
  const base = { published_min: min, year: prog.min_admission_year ?? null, track: prog.admission_track ?? null };
  if (p.tawjihi_avg == null) return { status: "missing-student-average", ...base };
  if (p.stream && prog.eligible_streams && prog.eligible_streams.length > 0 && !prog.eligible_streams.includes(p.stream)) {
    return { status: "stream-mismatch", ...base };
  }
  if (min == null) return { status: "minimum-not-verified", ...base };
  const margin = Math.round((p.tawjihi_avg - min) * 10) / 10;
  return { status: margin >= 0 ? "meets-published-minimum" : "below-published-minimum", margin, ...base };
}

export function estimateCost(p: LearnerProfile, prog: Program): CostEstimate {
  const years = FIELD_BY_ID[prog.field]?.nominal_years ?? 4;
  if (prog.credit_hours == null || prog.tuition_jod_per_credit_hour == null) {
    return { total_tuition_jod: null, per_year_jod: null, nominal_years: years, within_budget: null,
      basis: "Fee or credit hours not verified yet" };
  }
  const total = Math.round(prog.credit_hours * prog.tuition_jod_per_credit_hour);
  const perYear = Math.round(total / years);
  const within = p.budget_jod_per_year == null ? null : perYear <= p.budget_jod_per_year;
  return { total_tuition_jod: total, per_year_jod: perYear, nominal_years: years, within_budget: within,
    basis: `${prog.credit_hours} credit hours × ${prog.tuition_jod_per_credit_hour} JOD (tuition only, excludes registration and other fees), spread over ${years} nominal years` };
}

const norm = (s: string) => s.toLowerCase().trim();

export function scoreProgram(p: LearnerProfile, prog: Program, uni: University): ProgramMatch {
  const reasons: Reason[] = [];
  const missing: string[] = [];
  const field = FIELD_BY_ID[prog.field];
  const fieldName = field?.name_en ?? prog.field;
  const fieldNameAr = field?.name_ar ?? prog.field;

  // Interest fit (0-35)
  if (p.interests.includes(prog.field)) {
    reasons.push({ code: "interest-match", weight: 35, en: `Matches your interest in ${fieldName}`, ar: `يتوافق مع اهتمامك بـ${fieldNameAr}` });
  }

  // Career fit (0-25)
  const careerText = [...p.dream_careers, ...p.career_tags].map(norm).join(" ");
  const tags = [...(prog.career_tags ?? []), ...(field?.careers ?? [])].map(norm);
  const hit = tags.find((t) => t && careerText.includes(t));
  if (hit) {
    reasons.push({ code: "career-match", weight: 25, en: `Leads toward careers like "${hit}" that you mentioned`, ar: `يقود إلى مسارات مثل "${hit}" التي ذكرتها` });
  }

  // Budget (−20..+15)
  const cost = estimateCost(p, prog);
  if (cost.within_budget === true) {
    reasons.push({ code: "within-budget", weight: 15, en: `Estimated tuition about ${cost.per_year_jod} JOD/year is within your budget`, ar: `الرسوم التقديرية نحو ${cost.per_year_jod} دينار سنوياً ضمن ميزانيتك` });
  } else if (cost.within_budget === false) {
    reasons.push({ code: "over-budget", weight: -20, en: `Estimated tuition about ${cost.per_year_jod} JOD/year is above your budget of ${p.budget_jod_per_year} JOD`, ar: `الرسوم التقديرية نحو ${cost.per_year_jod} دينار سنوياً أعلى من ميزانيتك (${p.budget_jod_per_year} دينار)` });
  } else if (cost.total_tuition_jod == null) {
    missing.push("tuition");
  }

  // Location (−10..+10)
  if (uni.city && p.preferred_cities.length > 0) {
    if (p.preferred_cities.map(norm).includes(norm(uni.city))) {
      reasons.push({ code: "preferred-city", weight: 10, en: `Located in ${uni.city}, one of your preferred cities`, ar: `يقع في ${uni.city}، إحدى مدنك المفضلة` });
    } else if (p.open_to_relocate === false) {
      reasons.push({ code: "outside-city", weight: -10, en: `Located in ${uni.city}, outside your preferred cities`, ar: `يقع في ${uni.city}، خارج مدنك المفضلة` });
    }
  }

  // University type preference (−5..+5)
  if (p.university_type && p.university_type !== "any") {
    reasons.push(p.university_type === uni.type
      ? { code: "type-match", weight: 5, en: `A ${uni.type} university, as you prefer`, ar: uni.type === "public" ? "جامعة حكومية كما تفضّل" : "جامعة خاصة كما تفضّل" }
      : { code: "type-mismatch", weight: -5, en: `A ${uni.type} university (you preferred ${p.university_type})`, ar: "نوع الجامعة يختلف عن تفضيلك" });
  }

  // Practical experience signal (+5) only when sourced
  if (prog.internship_note) {
    reasons.push({ code: "internship", weight: 5, en: `Practical training: ${prog.internship_note}`, ar: `تدريب عملي: ${prog.internship_note}` });
  }

  // Data quality penalty: unverified records rank lower and say so
  if (prog.verification !== "verified") {
    reasons.push({ code: "partial-data", weight: -3, en: "Some details of this program are not yet verified", ar: "بعض تفاصيل هذا البرنامج غير موثّقة بعد" });
  }
  if (prog.min_admission_avg == null) missing.push("admission minimum");

  const raw = reasons.reduce((s, r) => s + r.weight, 0);
  const suitability = Math.max(0, Math.min(100, Math.round(raw * (100 / 95))));
  return { program: prog, university: uni, eligibility: checkEligibility(p, prog), suitability, reasons, cost, missing_data: missing };
}

export function rankPrograms(p: LearnerProfile, programs: Program[], unis: University[]): ProgramMatch[] {
  const byId = Object.fromEntries(unis.map((u) => [u.id, u]));
  const order: Record<EligibilityStatus, number> = {
    "meets-published-minimum": 0, "minimum-not-verified": 1, "missing-student-average": 1, "below-published-minimum": 2, "stream-mismatch": 3,
  };
  return programs
    .filter((pr) => byId[pr.university_id])
    .map((pr) => scoreProgram(p, pr, byId[pr.university_id]))
    .sort((a, b) => order[a.eligibility.status] - order[b.eligibility.status] || b.suitability - a.suitability);
}
