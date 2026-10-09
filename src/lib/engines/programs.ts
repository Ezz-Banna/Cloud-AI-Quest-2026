// Deterministic program matching. Eligibility is a rule check against stored, sourced minimums;
// fit is a separate weighted score. The two are never merged into one number, and fit is never
// an admission probability.
//
// Fit method (documented in docs/04-fit-engine.md):
//   each criterion c gives a sub-score s_c in [0, 1], or null when the program record or the student
//   profile lacks the data it needs; null criteria are left out instead of guessed.
//   fit = 100 × Σ w_c·s_c / Σ w_c over criteria with data       (w_c = student weight 0-5)
//   coverage = Σ w_c over criteria with data / Σ w_c over criteria the student cares about
//   rank_score = fit × coverage + 50 × (1 − coverage): for ordering only, a criterion without data
//   counts as halfway, so missing data neither helps nor hurts a program. Programs are ranked by
//   eligibility group first (eligible, unknown, ineligible), then rank_score.
import type { FitCriterion, LearnerProfile, Program, University } from "../types";
import { cityLabel } from "../i18n";
import { FIELD_BY_ID, SUBJECT_TOPICS, STRENGTH_TOPICS, CURRICULUM_TOPICS, TOPIC_BY_ID } from "../data/taxonomy";

export type EligibilityStatus =
  | "meets-published-minimum"
  | "below-published-minimum"
  | "stream-mismatch"
  | "minimum-not-verified"
  | "conflicting-sources"
  | "missing-student-average";

export type EligibilityGroup = "eligible" | "ineligible" | "unknown";

export interface Eligibility {
  status: EligibilityStatus;
  group: EligibilityGroup;
  published_min?: number | null;
  year?: string | null;
  track?: string | null;
  margin?: number;
  /** Latest published competitive cut-off, shown as history only. */
  last_cutoff?: { year: string; value: number; source_url: string } | null;
}

export interface Reason {
  code: string;
  weight: number; // points this reason adds to fit (0 for notes; negative only for trade-offs)
  en: string;
  ar: string;
}

export interface Factor {
  criterion: FitCriterion;
  weight: number; // student weight 0-5
  score: number | null; // 0-1, null = no data, left out
  points: number; // contribution to fit (0-100 scale), 0 when score is null
  en: string;
  ar: string;
}

export interface CostEstimate {
  total_tuition_jod: number | null;
  extra_fees_jod: number | null; // other mandatory fees over the whole degree, when published
  total_jod: number | null;
  per_year_jod: number | null;
  nominal_years: number;
  within_budget: boolean | null;
  basis: string;
  basis_ar: string;
  fee_year: string | null;
  checked_at: string | null;
}

export interface Alternative {
  program_id: string;
  kind: "same-field-eligible" | "related-field-eligible" | "cheaper-same-field" | "closer-same-field";
  en: string;
  ar: string;
}

export interface ProgramMatch {
  program: Program;
  university: University;
  eligibility: Eligibility;
  suitability: number; // fit 0-100 over criteria with data
  coverage: number; // 0-1 share of the student's weights that could be scored
  rank_score: number;
  factors: Factor[];
  reasons: Reason[]; // criteria that added points (for compact lists)
  strengths: Reason[];
  trade_offs: Reason[];
  alternatives: Alternative[];
  cost: CostEstimate;
  missing_data: string[];
}

export const CRITERIA: FitCriterion[] = ["interest", "curriculum", "career", "affordability", "location", "type", "applied"];
export const CRITERION_LABEL: Record<FitCriterion, { en: string; ar: string }> = {
  interest: { en: "Field of interest", ar: "مجال الاهتمام" },
  curriculum: { en: "What you'd study", ar: "محتوى الدراسة" },
  career: { en: "Career goals", ar: "الأهداف المهنية" },
  affordability: { en: "Cost", ar: "الكلفة" },
  location: { en: "Location", ar: "الموقع" },
  type: { en: "Public or private", ar: "حكومية أو خاصة" },
  applied: { en: "Practical training", ar: "التدريب العملي" },
};

type FactField = "tuition_jod_per_credit_hour" | "credit_hours" | "min_admission_avg";
const conflicted = (prog: Program, f: string) => (prog.conflicts ?? []).some((c) => c.field === f);
/** A fact is usable only when present and not disputed between sources. */
const fact = <K extends FactField>(prog: Program, k: K): number | null =>
  conflicted(prog, k) ? null : (prog[k] ?? null);

export function checkEligibility(p: LearnerProfile, prog: Program): Eligibility {
  const min = fact(prog, "min_admission_avg");
  const cut = (prog.historical_thresholds ?? []).filter((h) => h.kind === "competitive-cutoff").sort((a, b) => b.year.localeCompare(a.year))[0];
  const base = { published_min: min, year: prog.min_admission_year ?? null, track: prog.admission_track ?? null,
    last_cutoff: cut ? { year: cut.year, value: cut.value, source_url: cut.source_url } : null };
  if (p.tawjihi_avg == null) return { status: "missing-student-average", group: "unknown", ...base };
  if (p.stream && prog.eligible_streams && prog.eligible_streams.length > 0 && !prog.eligible_streams.includes(p.stream)) {
    return { status: "stream-mismatch", group: "ineligible", ...base };
  }
  if (conflicted(prog, "min_admission_avg")) return { status: "conflicting-sources", group: "unknown", ...base };
  if (min == null) return { status: "minimum-not-verified", group: "unknown", ...base };
  const margin = Math.round((p.tawjihi_avg - min) * 10) / 10;
  return margin >= 0
    ? { status: "meets-published-minimum", group: "eligible", margin, ...base }
    : { status: "below-published-minimum", group: "ineligible", margin, ...base };
}

const feeTotal = (fees: Program["additional_fees"], years: number) =>
  (fees ?? []).reduce((s, f) => s + f.amount_jod * (f.per === "semester" ? 2 * years : f.per === "year" ? years : 1), 0);

export function estimateCost(p: LearnerProfile, prog: Program, uni?: University): CostEstimate {
  const years = FIELD_BY_ID[prog.field]?.nominal_years ?? 4;
  const ch = fact(prog, "credit_hours");
  const fee = fact(prog, "tuition_jod_per_credit_hour");
  const checked = prog.sources.map((s) => s.checked_at).filter(Boolean).sort().at(-1) ?? null;
  const fees = [...(uni?.additional_fees ?? []), ...(prog.additional_fees ?? [])];
  const base = { nominal_years: years, fee_year: prog.tuition_year ?? null, checked_at: checked };
  if (ch == null || fee == null) {
    const disputed = conflicted(prog, "credit_hours") || conflicted(prog, "tuition_jod_per_credit_hour");
    return { ...base, total_tuition_jod: null, extra_fees_jod: null, total_jod: null, per_year_jod: null, within_budget: null,
      basis: disputed ? "Sources disagree on the fee or credit hours" : "Fee or credit hours not verified yet",
      basis_ar: disputed ? "المصادر مختلفة حول الرسوم أو الساعات المعتمدة" : "لم يتم التحقق من الرسوم أو الساعات المعتمدة بعد" };
  }
  const tuition = Math.round(ch * fee);
  const extra = fees.length ? Math.round(feeTotal(fees, years)) : null;
  const total = tuition + (extra ?? 0);
  const perYear = Math.round(total / years);
  const within = p.budget_jod_per_year == null ? null : perYear <= p.budget_jod_per_year;
  return { ...base, total_tuition_jod: tuition, extra_fees_jod: extra, total_jod: total, per_year_jod: perYear, within_budget: within,
    basis: `${ch} credit hours × ${fee} JOD${extra != null ? ` + ${extra} JOD other mandatory fees` : " (tuition only; other mandatory fees not yet verified)"}, over ${years} nominal years`,
    basis_ar: `${ch} ساعة معتمدة × ${fee} دينار${extra != null ? ` + ${extra} دينار رسوم إلزامية أخرى` : " (رسوم الساعات فقط؛ الرسوم الإلزامية الأخرى غير موثّقة بعد)"}، على ${years} سنوات دراسية` };
}

const norm = (s: string) => s.toLowerCase().trim();

/** Default weights, raised by the student's ranked priorities, then replaced by any slider values they set. */
export function fitWeights(p: LearnerProfile): Record<FitCriterion, number> {
  const w: Record<FitCriterion, number> = { interest: 3, curriculum: 2, career: 3, affordability: 2, location: 2, type: 0, applied: 1 };
  if (p.university_type && p.university_type !== "any") w.type = 2;
  if (p.learning_style === "hands-on") w.applied = 3;
  const boost = [3, 2, 1];
  (p.priorities ?? []).slice(0, 3).forEach((pr, i) => {
    const c: FitCriterion | null = pr === "affordability" ? "affordability" : pr === "location" ? "location" : pr === "career-fit" ? "career"
      : pr === "interest-fit" ? "interest" : pr === "public-university" || pr === "private-university" ? "type" : null;
    if (c) w[c] = Math.min(5, Math.max(w[c], 2) + boost[i]);
  });
  for (const c of CRITERIA) {
    const v = p.fit_weights?.[c];
    if (typeof v === "number" && v >= 0 && v <= 5) w[c] = v;
  }
  return w;
}

/** Topics the student has signalled interest in, from subjects, strengths, hobbies and achievements. */
export function studentTopics(p: LearnerProfile): Set<string> {
  const out = new Set<string>();
  for (const s of p.subjects ?? []) for (const t of SUBJECT_TOPICS[s] ?? []) out.add(t);
  for (const s of p.strengths ?? []) for (const t of STRENGTH_TOPICS[norm(s)] ?? []) out.add(t);
  const text = norm([...(p.hobbies ?? []), ...p.achievements.map((a) => `${a.title} ${a.description}`)].join(" "));
  if (text) for (const t of CURRICULUM_TOPICS) if (t.keywords.some((k) => new RegExp(`(^|[^\\p{L}])${k}`, "u").test(text))) out.add(t.id);
  return out;
}

function typePreference(p: LearnerProfile): "public" | "private" | null {
  if (p.university_type && p.university_type !== "any") return p.university_type;
  if (p.priorities?.includes("public-university")) return "public";
  if (p.priorities?.includes("private-university")) return "private";
  return null;
}

export function scoreProgram(p: LearnerProfile, prog: Program, uni: University): ProgramMatch {
  const field = FIELD_BY_ID[prog.field];
  const fieldName = field?.name_en ?? prog.field;
  const fieldNameAr = field?.name_ar ?? prog.field;
  const w = fitWeights(p);
  const cost = estimateCost(p, prog, uni);
  const missing: string[] = [];
  const trade: Reason[] = [];
  const f: Factor[] = [];
  const add = (criterion: FitCriterion, score: number | null, en: string, ar: string) =>
    f.push({ criterion, weight: w[criterion], score: score == null ? null : Math.max(0, Math.min(1, score)), points: 0, en, ar });

  // A. Interest in the field (student side needed)
  if (p.interests.length === 0) add("interest", null, "You haven't picked fields of interest yet", "لم تختر مجالات اهتمام بعد");
  else if (p.interests.includes(prog.field)) add("interest", 1, `Matches your interest in ${fieldName}`, `يتوافق مع اهتمامك بـ${fieldNameAr}`);
  else if (p.interests.some((i) => field?.related.includes(i))) add("interest", 0.5, `${fieldName} is close to a field you picked`, `${fieldNameAr} قريب من مجال اخترته`);
  else add("interest", 0, `${fieldName} is not among the fields you picked`, `${fieldNameAr} ليس من المجالات التي اخترتها`);

  // C. Curriculum content from the published study plan
  const topics = prog.curriculum_topics ?? [];
  const mine = studentTopics(p);
  if (topics.length === 0) { add("curriculum", null, "Study plan not yet read", "لم تتم قراءة الخطة الدراسية بعد"); missing.push("study plan"); }
  else if (mine.size === 0) add("curriculum", null, "Tell us your favourite subjects to compare study plans", "أخبرنا بموادك المفضلة لمقارنة الخطط الدراسية");
  else {
    const hits = topics.filter((t) => mine.has(t));
    const names = (lang: "en" | "ar") => hits.slice(0, 3).map((t) => (lang === "ar" ? TOPIC_BY_ID[t]?.name_ar : TOPIC_BY_ID[t]?.name_en) ?? t);
    add("curriculum", Math.min(1, hits.length / Math.min(3, topics.length)),
      hits.length ? `Study plan covers ${names("en").join(", ")}, which you enjoy` : "Study plan topics don't overlap with subjects you enjoy",
      hits.length ? `الخطة الدراسية تشمل ${names("ar").join("، ")} مما تحبه` : "مواضيع الخطة الدراسية لا تتقاطع مع موادك المفضلة");
  }

  // D. Career pathway alignment (what the field leads toward, not promised outcomes)
  const careerText = [...p.dream_careers, ...p.career_tags, ...(p.industries ?? [])].map(norm).join(" ");
  if (!careerText) add("career", null, "No career goals given yet", "لم تذكر أهدافاً مهنية بعد");
  else {
    const tags = [...(prog.career_tags ?? []).map((t) => t.replace(/-/g, " ")), ...(field?.careers ?? [])].map(norm);
    const hit = tags.find((t) => t && careerText.includes(t));
    add("career", hit ? 1 : 0,
      hit ? `Commonly leads toward work like "${hit}", which you mentioned` : `Not a usual route to the careers you mentioned`,
      hit ? `يقود عادة إلى مجالات مثل "${hit}" التي ذكرتها` : "ليس مساراً معتاداً للمهن التي ذكرتها");
  }

  // B. Affordability
  if (cost.per_year_jod == null) { add("affordability", null, "Cost not verified", "الكلفة غير موثّقة"); missing.push("tuition"); }
  else if (p.budget_jod_per_year == null) add("affordability", null, `About ${cost.per_year_jod} JOD/year (no budget given)`, `نحو ${cost.per_year_jod} دينار سنوياً (لم تحدد ميزانية)`);
  else if (cost.within_budget) {
    const headroom = Math.max(0, 1 - cost.per_year_jod / p.budget_jod_per_year);
    add("affordability", 0.3 + 0.7 * headroom, `About ${cost.per_year_jod} JOD/year, within your ${p.budget_jod_per_year} JOD budget`, `نحو ${cost.per_year_jod} دينار سنوياً ضمن ميزانيتك (${p.budget_jod_per_year} دينار)`);
  } else {
    const over = cost.per_year_jod / p.budget_jod_per_year - 1;
    add("affordability", Math.max(0, 0.25 - over), `About ${cost.per_year_jod} JOD/year, above your ${p.budget_jod_per_year} JOD budget`, `نحو ${cost.per_year_jod} دينار سنوياً، أعلى من ميزانيتك (${p.budget_jod_per_year} دينار)`);
    trade.push({ code: "over-budget", weight: 0, en: `Estimated cost is above your budget by about ${cost.per_year_jod - p.budget_jod_per_year} JOD a year`, ar: `الكلفة التقديرية أعلى من ميزانيتك بنحو ${cost.per_year_jod - p.budget_jod_per_year} دينار سنوياً` });
  }
  if (cost.per_year_jod != null && cost.extra_fees_jod == null) missing.push("other mandatory fees");

  // Location
  const places = [uni.city, ...(uni.campuses ?? [])].filter(Boolean) as string[];
  if (p.preferred_cities.length === 0) add("location", null, "No preferred city given", "لم تحدد مدينة مفضلة");
  else if (places.length === 0) { add("location", null, "Campus location not verified", "موقع الحرم غير موثّق"); missing.push("campus location"); }
  else if (p.preferred_cities.some((c) => places.some((pl) => norm(pl).includes(norm(c))))) add("location", 1, `Campus in ${places.join(", ")}, one of your preferred cities`, `حرم في ${places.map((x) => cityLabel(x, "ar")).join("، ")}، إحدى مدنك المفضلة`);
  else {
    add("location", p.open_to_relocate === false ? 0 : 0.35, `In ${uni.city}, outside your preferred cities`, `في ${cityLabel(uni.city, "ar")}، خارج مدنك المفضلة`);
    trade.push({ code: "outside-city", weight: 0, en: `Campus is in ${uni.city}, so you may need daily travel or housing${uni.transport_note || uni.accommodation_note ? "" : " (transport and housing details not verified)"}`, ar: `الحرم في ${cityLabel(uni.city, "ar")}، وقد تحتاج إلى تنقل يومي أو سكن` });
  }

  // Public or private
  const typePref = typePreference(p);
  if (!typePref) add("type", null, "No preference between public and private", "لا تفضيل بين الحكومية والخاصة");
  else add("type", typePref === uni.type ? 1 : 0, uni.type === "public" ? "A public university" : "A private university", uni.type === "public" ? "جامعة حكومية" : "جامعة خاصة");

  // Applied learning
  if (prog.internship_note) add("applied", 1, `Practical training: ${prog.internship_note}`, `تدريب عملي: ${prog.internship_note}`);
  else { add("applied", null, "Practical training details not verified", "تفاصيل التدريب العملي غير موثّقة"); missing.push("practical training details"); }

  // Score
  const active = f.filter((x) => x.weight > 0);
  const scored = active.filter((x) => x.score != null);
  const wSum = scored.reduce((s, x) => s + x.weight, 0);
  const wAll = active.reduce((s, x) => s + x.weight, 0);
  for (const x of f) x.points = x.score != null && wSum > 0 ? Math.round((100 * x.weight * x.score) / wSum * 10) / 10 : 0;
  const suitability = wSum > 0 ? Math.round(scored.reduce((s, x) => s + x.points, 0)) : 0;
  const coverage = wAll > 0 ? Math.round((wSum / wAll) * 100) / 100 : 0;
  const rank_score = Math.round((suitability * coverage + 50 * (1 - coverage)) * 10) / 10;

  const strengths: Reason[] = scored.filter((x) => (x.score ?? 0) >= 0.7).sort((a, b) => b.points - a.points)
    .map((x) => ({ code: x.criterion, weight: x.points, en: x.en, ar: x.ar }));
  for (const x of scored) if ((x.score ?? 1) < 0.3 && !trade.some((t) => (x.criterion === "affordability" && t.code === "over-budget") || (x.criterion === "location" && t.code === "outside-city"))) {
    trade.push({ code: `weak-${x.criterion}`, weight: 0, en: x.en, ar: x.ar });
  }
  for (const s of prog.verified_achievements ?? []) strengths.push({ code: "verified-achievement", weight: 0, en: s.text, ar: s.text });

  const elig = checkEligibility(p, prog);
  if (elig.status === "meets-published-minimum" && elig.last_cutoff && p.tawjihi_avg != null && p.tawjihi_avg < elig.last_cutoff.value) {
    trade.push({ code: "below-last-cutoff", weight: 0, en: `Your average is above the minimum to apply but below the ${elig.last_cutoff.year} competitive cut-off (${elig.last_cutoff.value}); places are competitive and cut-offs change each year`, ar: `معدلك أعلى من الحد الأدنى للتقديم لكنه أقل من معدل القبول التنافسي لعام ${elig.last_cutoff.year} (${elig.last_cutoff.value})؛ المقاعد تنافسية والمعدلات تتغير سنوياً` });
  }
  if (prog.verification !== "verified") trade.push({ code: "partial-data", weight: 0, en: "Some details of this program are not yet verified", ar: "بعض تفاصيل هذا البرنامج غير موثّقة بعد" });
  for (const c of prog.conflicts ?? []) missing.push(`conflicting sources: ${c.field.replace(/_/g, " ")}`);
  if (elig.published_min == null && !conflicted(prog, "min_admission_avg")) missing.push("admission minimum");
  if (prog.credit_hours == null) missing.push("credit hours");
  if ((prog.accreditation_status ?? uni.accreditation_status ?? null) == null) missing.push("accreditation check");
  if ((p.accessibility_needs ?? []).length > 0 && !(uni.accessibility_facilities ?? []).length) missing.push("accessibility facilities");

  return {
    program: prog, university: uni, eligibility: elig, suitability, coverage, rank_score, factors: f,
    reasons: scored.filter((x) => x.points > 0).sort((a, b) => b.points - a.points).map((x) => ({ code: x.criterion, weight: x.points, en: x.en, ar: x.ar })),
    strengths, trade_offs: trade, alternatives: [], cost, missing_data: [...new Set(missing)],
  };
}

const GROUP_ORDER: Record<EligibilityGroup, number> = { eligible: 0, unknown: 1, ineligible: 2 };

/** Deterministic alternatives: only programs in the dataset, with the rule that makes them relevant. */
export function addAlternatives(matches: ProgramMatch[], p: LearnerProfile) {
  const name = (m: ProgramMatch, ar = false) => `${ar && m.program.name_ar ? m.program.name_ar : m.program.name_en} – ${ar && m.university.name_ar ? m.university.name_ar : m.university.name_en}`;
  for (const m of matches) {
    const out: Alternative[] = [];
    const others = matches.filter((o) => o !== m);
    if (m.eligibility.group === "ineligible") {
      const same = others.filter((o) => o.program.field === m.program.field && o.eligibility.group === "eligible").slice(0, 2);
      for (const o of same) out.push({ program_id: o.program.id, kind: "same-field-eligible", en: `Same field where your average meets the minimum: ${name(o)}`, ar: `التخصص نفسه حيث يحقق معدلك الحد الأدنى: ${name(o, true)}` });
      const rel = FIELD_BY_ID[m.program.field]?.related ?? [];
      const relM = others.filter((o) => rel.includes(o.program.field) && o.eligibility.group === "eligible").slice(0, 2);
      for (const o of relM) out.push({ program_id: o.program.id, kind: "related-field-eligible", en: `Related field you can apply to: ${name(o)}`, ar: `تخصص قريب يمكنك التقديم إليه: ${name(o, true)}` });
    }
    if (m.cost.within_budget === false) {
      const cheaper = others.find((o) => o.program.field === m.program.field && o.cost.within_budget === true && o.eligibility.group !== "ineligible");
      if (cheaper) out.push({ program_id: cheaper.program.id, kind: "cheaper-same-field", en: `Same field within your budget (about ${cheaper.cost.per_year_jod} JOD/year): ${name(cheaper)}`, ar: `التخصص نفسه ضمن ميزانيتك (نحو ${cheaper.cost.per_year_jod} دينار سنوياً): ${name(cheaper, true)}` });
    }
    if (m.trade_offs.some((t) => t.code === "outside-city") && p.preferred_cities.length) {
      const near = others.find((o) => o.program.field === m.program.field && o.factors.some((x) => x.criterion === "location" && x.score === 1) && o.eligibility.group !== "ineligible");
      if (near) out.push({ program_id: near.program.id, kind: "closer-same-field", en: `Same field in a city you prefer: ${name(near)}`, ar: `التخصص نفسه في مدينة تفضلها: ${name(near, true)}` });
    }
    m.alternatives = out;
  }
  return matches;
}

export function rankPrograms(p: LearnerProfile, programs: Program[], unis: University[]): ProgramMatch[] {
  const byId = Object.fromEntries(unis.map((u) => [u.id, u]));
  const ranked = programs
    .filter((pr) => byId[pr.university_id])
    .map((pr) => scoreProgram(p, pr, byId[pr.university_id]))
    .sort((a, b) => GROUP_ORDER[a.eligibility.group] - GROUP_ORDER[b.eligibility.group] || b.rank_score - a.rank_score || a.program.id.localeCompare(b.program.id));
  return addAlternatives(ranked, p);
}

export interface FollowUp { id: "interests" | "career" | "budget" | "location" | "average" | "subjects"; en: string; ar: string; why_en: string; why_ar: string }

/**
 * Follow-up questions, asked only when the answer could change the top results: the missing input
 * must matter for at least two of the top programs in different ways.
 */
export function followUps(p: LearnerProfile, matches: ProgramMatch[]): FollowUp[] {
  const top = matches.slice(0, 6);
  const out: FollowUp[] = [];
  const distinct = <T,>(xs: T[]) => new Set(xs.filter((x) => x != null)).size;
  if (p.tawjihi_avg == null && distinct(top.map((m) => m.eligibility.published_min)) >= 2)
    out.push({ id: "average", en: "What is your Tawjihi average (or expected average)?", ar: "ما معدلك في التوجيهي (أو معدلك المتوقع)؟", why_en: "The top programs have different minimum averages to apply.", why_ar: "للبرامج الأولى حدود دنيا مختلفة للتقديم." });
  if (p.interests.length === 0 && distinct(top.map((m) => m.program.field)) >= 2)
    out.push({ id: "interests", en: "Which of these fields would you enjoy studying for four years?", ar: "أي من هذه المجالات تستمتع بدراسته لأربع سنوات؟", why_en: "Your top results span several fields.", why_ar: "نتائجك الأولى تشمل عدة مجالات." });
  if ((p.subjects ?? []).length === 0 && top.some((m) => (m.program.curriculum_topics ?? []).length > 0))
    out.push({ id: "subjects", en: "Which school subjects do you enjoy most?", ar: "ما المواد المدرسية التي تستمتع بها أكثر؟", why_en: "Some top programs have study plans we can compare with what you enjoy.", why_ar: "لبعض البرامج خطط دراسية يمكن مقارنتها بما تحبه." });
  if (!p.dream_careers.length && !p.career_tags.length && !(p.industries ?? []).length && distinct(top.map((m) => m.program.field)) >= 2)
    out.push({ id: "career", en: "Is there any kind of work you'd like to do one day? It's fine to say you're not sure.", ar: "هل هناك نوع من العمل تحب أن تقوم به يوماً ما؟ لا بأس إن لم تكن متأكداً.", why_en: "Career goals would separate programs that look similar now.", why_ar: "الأهداف المهنية تميّز بين برامج تبدو متشابهة الآن." });
  const costs = top.map((m) => m.cost.per_year_jod).filter((x): x is number => x != null);
  if (p.budget_jod_per_year == null && costs.length >= 2 && Math.max(...costs) > 1.3 * Math.min(...costs))
    out.push({ id: "budget", en: "Roughly how much can your family spend on tuition per year?", ar: "كم تستطيع عائلتك أن تنفق تقريباً على الرسوم سنوياً؟", why_en: `Yearly cost among your top programs ranges from about ${Math.min(...costs)} to ${Math.max(...costs)} JOD.`, why_ar: `تتراوح الكلفة السنوية لبرامجك الأولى بين ${Math.min(...costs)} و${Math.max(...costs)} دينار تقريباً.` });
  if (p.preferred_cities.length === 0 && distinct(top.map((m) => m.university.city)) >= 2)
    out.push({ id: "location", en: "Which city would you prefer to study in?", ar: "في أي مدينة تفضّل الدراسة؟", why_en: "Your top programs are in different cities.", why_ar: "برامجك الأولى في مدن مختلفة." });
  return out.slice(0, 3);
}
