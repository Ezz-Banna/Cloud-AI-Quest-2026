// The ten student scenarios from the data-accuracy audit, run against the REAL seed data (data/verified).
// Profiles are synthetic; every assertion checks that results follow the stored, sourced records.
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrograms, getScholarships, getUniversities } from "@/lib/data/repo";
import { rankPrograms, scoreProgram, type ProgramMatch } from "@/lib/engines/programs";
import { matchScholarships } from "@/lib/engines/scholarships";
import { fallbackProfile } from "@/lib/ai/fallback";
import { templateExplanation, numbersSupported, urlsSupported } from "@/lib/ai/modules";
import { emptyProfile, type LearnerProfile, type Program } from "@/lib/types";

const programs = getPrograms(), unis = getUniversities(), schol = getScholarships();
const P = (o: Partial<LearnerProfile>): LearnerProfile => ({ ...emptyProfile(), stream: "scientific", ...o });
const rank = (p: LearnerProfile) => rankPrograms(p, programs, unis);

/** Every number on a card must trace back to the stored record. */
function grounded(p: LearnerProfile, ms: ProgramMatch[]) {
  for (const m of ms) {
    const prog = programs.find((x) => x.id === m.program.id)!;
    if (m.eligibility.published_min != null) expect(m.eligibility.published_min).toBe(prog.min_admission_avg);
    if (m.cost.total_tuition_jod != null) expect(m.cost.total_tuition_jod).toBe(Math.round(prog.credit_hours! * prog.tuition_jod_per_credit_hour!));
    else expect(m.cost.per_year_jod).toBeNull();
    if (m.cost.per_year_jod != null) expect(m.cost.basis).toMatch(m.cost.extra_fees_jod == null ? /tuition only/ : /other mandatory fees/);
    expect(m.cost.fee_year).toBe(prog.tuition_year ?? null);
    if (p.tawjihi_avg != null && m.eligibility.status === "meets-published-minimum") expect(p.tawjihi_avg).toBeGreaterThanOrEqual(prog.min_admission_avg!);
  }
}

describe("audit scenarios on real data", () => {
  it("1. excellent Tawjihi, high budget: every program with a published minimum is eligible; fit never claims admission", () => {
    const p = P({ tawjihi_avg: 98, budget_jod_per_year: 10000, interests: ["medicine", "pharmacy"] });
    const r = rank(p);
    grounded(p, r);
    for (const m of r) if (m.eligibility.published_min != null) expect(m.eligibility.group).toBe("eligible");
    expect(r[0].eligibility.group).toBe("eligible");
    const t = templateExplanation({ program: r[0].program.name_en, university: r[0].university.name_en, city: null,
      eligibility: { status: r[0].eligibility.status, published_min: r[0].eligibility.published_min, year: r[0].eligibility.year, student_avg: 98 },
      fit_score: r[0].suitability, tuition_per_year_jod: r[0].cost.per_year_jod, reasons: [], missing: [] }, "en");
    expect(t).toMatch(/does not guarantee admission|not verified/);
  });

  it("2. limited budget: programs above budget are flagged, unknown cost is never counted as affordable", () => {
    const p = P({ tawjihi_avg: 80, budget_jod_per_year: 1200, interests: ["computer-science"], priorities: ["affordability"] });
    const r = rank(p);
    grounded(p, r);
    for (const m of r) {
      if (m.cost.per_year_jod == null) { expect(m.cost.within_budget).toBeNull(); expect(m.factors.find((f) => f.criterion === "affordability")!.score).toBeNull(); }
      else expect(m.cost.within_budget).toBe(m.cost.per_year_jod <= 1200);
      if (m.cost.within_budget === false) expect(m.trade_offs.some((t) => t.code === "over-budget")).toBe(true);
    }
  });

  it("3. AI and software interest: AI/data and software programs lead; their fit cites the interest", () => {
    const p = P({ tawjihi_avg: 85, interests: ["ai-data-science", "software-engineering"], dream_careers: ["software developer"] });
    const r = rank(p);
    grounded(p, r);
    const top = r.filter((m) => m.eligibility.group === "eligible").slice(0, 5);
    expect(top.length).toBeGreaterThan(0);
    for (const m of top) expect(["ai-data-science", "software-engineering", "computer-science"]).toContain(m.program.field);
  });

  it("4. grades below a verified minimum: shown as below the published minimum with eligible alternatives, never as eligible", () => {
    const p = P({ tawjihi_avg: 66, interests: ["medicine"] });
    const r = rank(p);
    grounded(p, r);
    const med = r.filter((m) => m.program.field === "medicine" && m.eligibility.published_min != null);
    expect(med.length).toBeGreaterThan(0);
    for (const m of med) { expect(m.eligibility.status).toBe("below-published-minimum"); expect(m.eligibility.group).toBe("ineligible"); }
    expect(r.findIndex((m) => m.eligibility.group === "ineligible")).toBeGreaterThan(r.findIndex((m) => m.eligibility.group === "eligible"));
  });

  it("4b. a newer national minimum overrides an older university list: never 'eligible' between the two", () => {
    const at = (id: string, avg: number) => scoreProgram(P({ tawjihi_avg: avg }), programs.find((x) => x.id === id)!, unis.find((u) => u.id === programs.find((x) => x.id === id)!.university_id)!).eligibility;
    expect(at("just-medicine", 87).status).toBe("newer-minimum-reported"); // JUST list (2024) says 85; 90 reported from 2025/2026
    expect(at("just-medicine", 87).group).toBe("unknown");
    expect(at("just-medicine", 95).status).toBe("meets-published-minimum");
    expect(at("just-cs", 70).status).toBe("newer-minimum-reported"); // 65 on the 2024 list; 75 reported from 2026/2027
    expect(at("just-cs", 80).group).toBe("eligible");
    expect(at("just-medicine", 80).status).toBe("below-published-minimum");
  });

  it("5. strong extracurriculars and financial need: scholarships match on stated criteria; closed windows are never 'likely relevant'", () => {
    const p = P({ tawjihi_avg: 90, financial_need: true, interests: ["computer-science"],
      achievements: [{ id: "a", title: "Robotics club lead", description: "Led a team that built a line-following robot", links: [], skills: [] } as never] });
    const ms = matchScholarships(p, schol, "pre-university");
    expect(ms.length).toBe(schol.length);
    for (const m of ms) {
      if (m.window === "closed" || m.window === "historical") expect(m.status).not.toBe("likely-relevant");
      if (m.item.criteria.min_avg != null && m.status !== "not-eligible") expect(90).toBeGreaterThanOrEqual(m.item.criteria.min_avg);
    }
  });

  it("6. unsure about a major: no interests means the interest criterion is left out, not scored zero", () => {
    const p = P({ tawjihi_avg: 75 });
    const r = rank(p);
    grounded(p, r);
    for (const m of r) expect(m.factors.find((f) => f.criterion === "interest")!.score).toBeNull();
  });

  it("7. incomplete tuition or admissions data: cost and eligibility stay unknown, never zero", () => {
    const incomplete = programs.filter((x) => x.tuition_jod_per_credit_hour == null || x.credit_hours == null || x.min_admission_avg == null);
    expect(incomplete.length).toBeGreaterThan(0);
    const p = P({ tawjihi_avg: 80, budget_jod_per_year: 3000 });
    for (const prog of incomplete) {
      const m = scoreProgram(p, prog, unis.find((u) => u.id === prog.university_id)!);
      if (prog.min_admission_avg == null) expect(m.eligibility.status).toBe("minimum-not-verified");
      if (prog.tuition_jod_per_credit_hour == null || prog.credit_hours == null) { expect(m.cost.total_jod).toBeNull(); expect(m.missing_data).toContain("tuition"); }
    }
  });

  it("8. scholarship with an expired deadline is shown as closed", () => {
    const s = { ...schol[0], id: "expired", availability: { status: "open" as const, academic_year: "2025/2026", opens: "2025-09-01", closes: "2025-10-15" } };
    const [m] = matchScholarships(P({ tawjihi_avg: 90, financial_need: true }), [s], "pre-university", "2026-10-10");
    expect(m.window).toBe("closed");
    expect(m.status).not.toBe("likely-relevant");
  });

  it("9. conflicting sources: the disputed value is withheld and flagged", () => {
    const prog = programs.find((x) => x.min_admission_avg != null && x.tuition_jod_per_credit_hour != null)!;
    const disputed: Program = { ...prog, conflicts: [{ field: "tuition_jod_per_credit_hour", values: [{ value: 33, layer: "verified", source: "https://a.example" }, { value: 45, layer: "imported", source: "https://b.example" }] }] };
    const m = scoreProgram(P({ tawjihi_avg: 90 }), disputed, unis.find((u) => u.id === prog.university_id)!);
    expect(m.cost.total_jod).toBeNull();
    expect(m.cost.basis).toMatch(/disagree/);
    expect(m.missing_data.some((x) => x.startsWith("conflicting sources"))).toBe(true);
  });

  it("10. Arabic onboarding: the offline reader takes the average and interests from Arabic text", () => {
    const d = fallbackProfile("معدلي ٨٧ علمي وبحب البرمجة والذكاء الاصطناعي، وبدي أدرس بعمّان، ميزانيتي ٢٠٠٠ دينار");
    expect(d.tawjihi_avg).toBe(87);
    expect(d.interests).toEqual(expect.arrayContaining(["computer-science", "ai-data-science"]));
    expect(d.preferred_cities).toContain("Amman");
    const p = P({ tawjihi_avg: d.tawjihi_avg, interests: d.interests, preferred_cities: d.preferred_cities, budget_jod_per_year: d.budget_jod_per_year, language: "ar" });
    grounded(p, rank(p));
  });

  it("AI explanations reject numbers and links that are not in the facts", () => {
    const facts = { program: "Computer Science", fit_score: 70, tuition_per_year_jod: 1089 };
    expect(numbersSupported("About 1089 JOD a year.", facts)).toBe(true);
    expect(numbersSupported("Ranked 3rd in Jordan.", facts)).toBe(false);
    expect(urlsSupported("See https://fake-university.edu.jo/fees for details.", facts)).toBe(false);
    expect(urlsSupported("Check the official page.", facts)).toBe(true);
  });
});
