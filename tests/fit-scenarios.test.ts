// Scenario tests for the university fit engine. Fixtures below are ILLUSTRATIVE (synthetic numbers),
// chosen to exercise each rule; they are not real program data.
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { rankPrograms, scoreProgram, followUps, fitWeights, CRITERIA, type ProgramMatch } from "@/lib/engines/programs";
import { findConflicts } from "@/lib/data/repo";
import { fallbackProfile } from "@/lib/ai/fallback";
import { templateExplanation, numbersSupported } from "@/lib/ai/modules";
import { emptyProfile, type LearnerProfile, type Program, type University } from "@/lib/types";


const src = [{ url: "https://example.org/illustrative", checked_at: "2026-10-09" }];
const U = (id: string, city: string, type: "public" | "private" = "public", extra: Partial<University> = {}): University =>
  ({ id, name_en: `Uni ${id}`, type, city, sources: src, verification: "synthetic", ...extra });
const P = (id: string, uni: string, field: string, o: Partial<Program> = {}): Program =>
  ({ id, university_id: uni, name_en: `${field} @ ${uni}`, field, sources: src, verification: "verified", credit_hours: 132, tuition_jod_per_credit_hour: 40, min_admission_avg: 70, ...o });

const UNIS = [U("irb", "Irbid"), U("amm", "Amman"), U("amp", "Amman", "private"), U("zrq", "Zarqa")];
const PROGS = [
  P("cs-irb", "irb", "computer-science", { tuition_jod_per_credit_hour: 33, min_admission_avg: 80, curriculum_topics: ["programming", "mathematics", "data"], internship_note: "8-week internship" }),
  P("cs-amp", "amp", "computer-science", { tuition_jod_per_credit_hour: 90, min_admission_avg: 65, curriculum_topics: ["programming", "web-mobile"] }),
  P("se-zrq", "zrq", "software-engineering", { tuition_jod_per_credit_hour: 45, min_admission_avg: 70 }),
  P("med-amm", "amm", "medicine", { credit_hours: 240, tuition_jod_per_credit_hour: 60, min_admission_avg: 95, historical_thresholds: [{ year: "2025", kind: "competitive-cutoff", value: 98.1, source_url: "https://example.org/cutoffs" }] }),
  P("nur-irb", "irb", "nursing", { tuition_jod_per_credit_hour: 35, min_admission_avg: 70 }),
  P("pha-zrq", "zrq", "pharmacy", { credit_hours: 160, tuition_jod_per_credit_hour: 50, min_admission_avg: 80 }),
  P("bus-amm", "amm", "business-administration", { tuition_jod_per_credit_hour: 30, min_admission_avg: 60 }),
];
const base = (o: Partial<LearnerProfile>): LearnerProfile => ({ ...emptyProfile(), stream: "scientific", ...o });
const rank = (p: LearnerProfile, progs = PROGS, unis = UNIS) => rankPrograms(p, progs, unis);
const find = (r: ProgramMatch[], id: string) => r.find((m) => m.program.id === id)!;

/** Every explanation must be derivable from the ranking inputs. */
function assertConsistent(r: ProgramMatch[]) {
  for (const m of r) {
    const sum = m.factors.reduce((s, f) => s + f.points, 0);
    expect(Math.abs(sum - m.suitability)).toBeLessThanOrEqual(1);
    for (const f of m.factors) if (f.score == null || f.weight === 0) expect(f.points).toBe(0);
    for (const reason of m.reasons) expect(m.factors.find((f) => f.criterion === reason.code)?.points).toBe(reason.weight);
    expect(m.rank_score).toBeCloseTo(m.suitability * m.coverage + 50 * (1 - m.coverage), 0);
    // Fit is never described as a probability
    for (const t of [...m.reasons, ...m.strengths, ...m.trade_offs]) expect(`${t.en} ${t.ar}`).not.toMatch(/chance|probability|guarantee(?!d)|احتمال|فرصة القبول/i);
  }
  const groups = { eligible: 0, unknown: 1, ineligible: 2 } as const;
  for (let i = 1; i < r.length; i++) {
    const a = r[i - 1], b = r[i];
    expect(groups[a.eligibility.group] <= groups[b.eligibility.group]).toBe(true);
    if (a.eligibility.group === b.eligibility.group) expect(a.rank_score).toBeGreaterThanOrEqual(b.rank_score);
  }
}

describe("fit engine scenarios", () => {
  it("1. strong academic match: high average, clear interest, ranks the matching eligible program first", () => {
    const p = base({ tawjihi_avg: 96, interests: ["computer-science"], subjects: ["math", "computing"], dream_careers: ["software developer"], preferred_cities: ["Irbid"], budget_jod_per_year: 2500 });
    const r = rank(p);
    assertConsistent(r);
    expect(r[0].program.id).toBe("cs-irb");
    expect(r[0].eligibility.group).toBe("eligible");
    expect(r[0].suitability).toBeGreaterThan(85);
    expect(r[0].strengths.map((s) => s.code)).toEqual(expect.arrayContaining(["interest", "curriculum", "career", "location"]));
  });

  it("2. low-budget student: cheaper programs rise, over-budget ones show the gap and a cheaper alternative", () => {
    const p = base({ tawjihi_avg: 85, interests: ["computer-science"], budget_jod_per_year: 1200, priorities: ["affordability"] });
    const r = rank(p);
    assertConsistent(r);
    const cheap = find(r, "cs-irb"), pricey = find(r, "cs-amp");
    expect(cheap.cost.within_budget).toBe(true);
    expect(pricey.cost.within_budget).toBe(false);
    expect(r.indexOf(cheap)).toBeLessThan(r.indexOf(pricey));
    expect(pricey.trade_offs.some((t) => t.code === "over-budget")).toBe(true);
    expect(pricey.alternatives.some((a) => a.kind === "cheaper-same-field" && a.program_id === "cs-irb")).toBe(true);
  });

  it("3. uncertain career plans: unknown criteria are left out, coverage drops, and useful follow-ups are asked", () => {
    const p = base({ tawjihi_avg: 82 });
    const r = rank(p);
    assertConsistent(r);
    const m = r[0];
    expect(m.factors.find((f) => f.criterion === "career")!.score).toBeNull();
    expect(m.factors.find((f) => f.criterion === "interest")!.score).toBeNull();
    expect(m.coverage).toBeLessThan(0.5);
    const q = followUps(p, r).map((x) => x.id);
    expect(q).toContain("interests");
    expect(q.length).toBeLessThanOrEqual(3);
    // no follow-up about information we already have
    expect(q).not.toContain("average");
  });

  it("4. ambitious goal, limited admission options: below the minimum, with related eligible alternatives", () => {
    const p = base({ tawjihi_avg: 82, interests: ["medicine"], dream_careers: ["doctor"] });
    const r = rank(p);
    assertConsistent(r);
    const med = find(r, "med-amm");
    expect(med.eligibility.status).toBe("below-published-minimum");
    expect(med.eligibility.group).toBe("ineligible");
    expect(r.indexOf(med)).toBeGreaterThan(r.findIndex((m) => m.eligibility.group === "eligible"));
    const alt = med.alternatives.map((a) => a.program_id);
    expect(alt).toEqual(expect.arrayContaining(["pha-zrq", "nur-irb"]));
    expect(med.alternatives.every((a) => find(r, a.program_id).eligibility.group === "eligible")).toBe(true);
  });

  it("4b. historical cut-off is shown as history, never as a prediction", () => {
    const m = find(rank(base({ tawjihi_avg: 96, interests: ["medicine"] })), "med-amm");
    expect(m.eligibility.status).toBe("meets-published-minimum");
    expect(m.eligibility.last_cutoff?.value).toBe(98.1);
    const t = m.trade_offs.find((x) => x.code === "below-last-cutoff")!;
    expect(t.en).toMatch(/2025 competitive cut-off \(98\.1\)/);
    expect(t.en).toMatch(/change each year/);
  });

  it("5. missing tuition: cost is excluded from scoring (not guessed) and flagged; a thin record does not win on missing data", () => {
    const progs = [P("cs-known", "irb", "computer-science", { tuition_jod_per_credit_hour: 35 }), P("cs-unknown", "amm", "computer-science", { tuition_jod_per_credit_hour: null })];
    const p = base({ tawjihi_avg: 85, interests: ["computer-science"], budget_jod_per_year: 2000, priorities: ["affordability"] });
    const r = rank(p, progs);
    assertConsistent(r);
    const u = find(r, "cs-unknown");
    expect(u.cost.per_year_jod).toBeNull();
    expect(u.factors.find((f) => f.criterion === "affordability")!.score).toBeNull();
    expect(u.missing_data).toContain("tuition");
    expect(u.coverage).toBeLessThan(1);
    expect(r[0].program.id).toBe("cs-known");
  });

  it("6. missing accreditation information: flagged as missing, never claimed, never scored", () => {
    const withAcc = P("a", "irb", "computer-science", { accreditation_status: "listed", accreditation_source: "https://example.org/heac" });
    const without = P("b", "irb", "computer-science");
    const p = base({ tawjihi_avg: 85, interests: ["computer-science"] });
    const ma = scoreProgram(p, withAcc, UNIS[0]), mb = scoreProgram(p, without, UNIS[0]);
    expect(mb.missing_data).toContain("accreditation check");
    expect(ma.missing_data).not.toContain("accreditation check");
    expect(ma.suitability).toBe(mb.suitability);
    expect(JSON.stringify(mb.strengths)).not.toMatch(/accredit/i);
  });

  it("7. conflicting source records: disputed facts become unknown and are listed", () => {
    const verified = { id: "x", tuition_jod_per_credit_hour: 40, credit_hours: 132, min_admission_avg: 70, sources: [{ url: "https://uni.example/fees.pdf" }] };
    const imported = { ...verified, tuition_jod_per_credit_hour: 55, sources: [{ url: "https://other.example/list" }] };
    const conflicts = findConflicts(["tuition_jod_per_credit_hour", "credit_hours", "min_admission_avg"], imported, verified);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe("tuition_jod_per_credit_hour");
    const prog = P("x", "irb", "computer-science", { tuition_jod_per_credit_hour: 55, conflicts });
    const m = scoreProgram(base({ tawjihi_avg: 85, budget_jod_per_year: 2000 }), prog, UNIS[0]);
    expect(m.cost.per_year_jod).toBeNull();
    expect(m.cost.basis).toMatch(/disagree/);
    expect(m.missing_data).toContain("conflicting sources: tuition jod per credit hour");
    // conflict on the minimum makes eligibility unknown, never "meets"
    const p2 = P("y", "irb", "computer-science", { conflicts: [{ field: "min_admission_avg", values: [] }] });
    expect(scoreProgram(base({ tawjihi_avg: 85 }), p2, UNIS[0]).eligibility.status).toBe("conflicting-sources");
  });

  it("8. non-eligible program: stream mismatch and below-minimum are ranked after eligible and unknown ones", () => {
    const progs = [...PROGS, P("lit-only", "amm", "business-administration", { eligible_streams: ["literary"], min_admission_avg: 50 }), P("nomin", "zrq", "computer-science", { min_admission_avg: null })];
    const r = rank(base({ tawjihi_avg: 75, interests: ["computer-science", "business-administration"] }), progs);
    assertConsistent(r);
    expect(find(r, "lit-only").eligibility.status).toBe("stream-mismatch");
    expect(find(r, "nomin").eligibility.group).toBe("unknown");
    const firstBad = r.findIndex((m) => m.eligibility.group === "ineligible");
    expect(r.slice(firstBad).every((m) => m.eligibility.group === "ineligible")).toBe(true);
  });

  it("9. Arabic-language responses: offline reading of Arabic answers produces a usable profile and Arabic explanations", () => {
    const ar = "معدلي ٨٧.٥ علمي، أحب البرمجة وعلم الحاسوب، أسكن في إربد، ميزانيتي 1500 دينار";
    const f = fallbackProfile(ar);
    expect(f.tawjihi_avg).toBe(87.5);
    expect(f.stream).toBe("scientific");
    expect(f.interests).toContain("computer-science");
    expect(f.preferred_cities).toContain("Irbid");
    expect(f.budget_jod_per_year).toBe(1500);
    const p = base({ ...f, language: "ar", university_type: f.university_type, open_to_relocate: true, accessibility_needs: [], strengths: [] });
    const r = rank(p);
    assertConsistent(r);
    expect(r[0].program.id).toBe("cs-irb");
    const m = r[0];
    const facts = { program: m.program.name_en, university: m.university.name_en, city: m.university.city ?? null,
      eligibility: { status: m.eligibility.status, published_min: m.eligibility.published_min, year: m.eligibility.year, student_avg: p.tawjihi_avg },
      fit_score: m.suitability, tuition_per_year_jod: m.cost.per_year_jod, reasons: m.reasons.map((x) => ({ code: x.code, text: x.ar })), missing: m.missing_data };
    const text = templateExplanation(facts, "ar");
    expect(text).toMatch(/لا يضمن القبول/);
    expect(numbersSupported(text, facts)).toBe(true);
  });

  it("10. conflicting student preferences: trade-offs are named instead of hidden, and weights decide", () => {
    // wants Amman and the lowest cost, but the cheapest matching program is in Irbid
    const p = base({ tawjihi_avg: 88, interests: ["computer-science"], preferred_cities: ["Amman"], open_to_relocate: false, budget_jod_per_year: 1300 });
    const byCost = rank({ ...p, fit_weights: { affordability: 5, location: 1 } });
    const byPlace = rank({ ...p, fit_weights: { affordability: 1, location: 5 } });
    assertConsistent(byCost); assertConsistent(byPlace);
    expect(byCost.find((m) => m.program.field === "computer-science")!.program.id).toBe("cs-irb");
    expect(byPlace.find((m) => m.program.field === "computer-science")!.program.id).toBe("cs-amp");
    const irb = find(byCost, "cs-irb"), amp = find(byCost, "cs-amp");
    expect(irb.trade_offs.some((t) => t.code === "outside-city")).toBe(true);
    expect(amp.trade_offs.some((t) => t.code === "over-budget")).toBe(true);
  });
});

describe("weights and fairness", () => {
  it("student weights override defaults, and a zero weight removes a criterion", () => {
    const w = fitWeights(base({ fit_weights: { location: 0, career: 5 } }));
    expect(w.location).toBe(0);
    expect(w.career).toBe(5);
    expect(CRITERIA.every((c) => w[c] >= 0 && w[c] <= 5)).toBe(true);
    const m = scoreProgram(base({ preferred_cities: ["Amman"], fit_weights: { location: 0 } }), PROGS[0], UNIS[0]);
    expect(m.factors.find((f) => f.criterion === "location")!.points).toBe(0);
  });
  it("the student's name never changes the ranking", () => {
    const p = base({ tawjihi_avg: 85, interests: ["nursing"] });
    const a = rank({ ...p, name: "Ahmad" }).map((m) => m.program.id);
    const b = rank({ ...p, name: "Huda" }).map((m) => m.program.id);
    expect(a).toEqual(b);
  });
});
