import { describe, it, expect } from "vitest";
import { checkEligibility, estimateCost, rankPrograms } from "@/lib/engines/programs";
import { assessRole, buildPathway } from "@/lib/engines/gap";
import { matchScholarships } from "@/lib/engines/scholarships";
import { emptyProfile, type Course, type EmployerRole, type Program, type Scholarship, type University } from "@/lib/types";

const uni = (id: string, city: string, type: "public" | "private" = "public"): University => ({ id, name_en: id, type, city, sources: [], verification: "verified" });
const prog = (o: Partial<Program>): Program => ({ id: "p", university_id: "u1", name_en: "CS", field: "computer-science", sources: [], verification: "verified", ...o });

describe("eligibility", () => {
  const p = { ...emptyProfile(), tawjihi_avg: 85, stream: "scientific" as const };
  it("meets published minimum", () => {
    expect(checkEligibility(p, prog({ min_admission_avg: 80 })).status).toBe("meets-published-minimum");
  });
  it("below published minimum", () => {
    const e = checkEligibility(p, prog({ min_admission_avg: 90 }));
    expect(e.status).toBe("below-published-minimum");
    expect(e.margin).toBe(-5);
  });
  it("never guesses when minimum is unknown", () => {
    expect(checkEligibility(p, prog({ min_admission_avg: null })).status).toBe("minimum-not-verified");
  });
  it("stream mismatch blocks", () => {
    expect(checkEligibility({ ...p, stream: "literary" }, prog({ min_admission_avg: 60, eligible_streams: ["scientific"] })).status).toBe("stream-mismatch");
  });
});

describe("cost", () => {
  it("computes tuition only from verified numbers", () => {
    const c = estimateCost({ ...emptyProfile(), budget_jod_per_year: 2000 }, prog({ credit_hours: 132, tuition_jod_per_credit_hour: 50 }));
    expect(c.total_tuition_jod).toBe(6600);
    expect(c.per_year_jod).toBe(1650);
    expect(c.within_budget).toBe(true);
  });
  it("returns null when fee unknown", () => {
    expect(estimateCost(emptyProfile(), prog({ credit_hours: 132 })).total_tuition_jod).toBeNull();
  });
});

describe("ranking", () => {
  it("puts eligible interest matches first", () => {
    const p = { ...emptyProfile(), tawjihi_avg: 85, interests: ["computer-science"], preferred_cities: ["Irbid"] };
    const r = rankPrograms(p, [
      prog({ id: "a", university_id: "u1", min_admission_avg: 95 }),
      prog({ id: "b", university_id: "u2", min_admission_avg: 80 }),
      prog({ id: "c", university_id: "u1", field: "medicine", min_admission_avg: 70 }),
    ], [uni("u1", "Amman"), uni("u2", "Irbid")]);
    expect(r[0].program.id).toBe("b");
    expect(r[0].reasons.map((x) => x.code)).toContain("location");
    expect(r[r.length - 1].program.id).toBe("a");
  });
});

const role: EmployerRole = {
  id: "r", employer_id: "e", title: "Junior Frontend", kind: "job", description: "", verification: "synthetic",
  requirements: [
    { skill_id: "javascript", level: 2, mandatory: true },
    { skill_id: "react", level: 2, mandatory: true },
    { skill_id: "rest-api", level: 2, mandatory: true },
    { skill_id: "git", level: 2, mandatory: true },
    { skill_id: "html", level: 2, mandatory: false },
  ],
};
const course = (id: string, skills: string[], extra: Partial<Course> = {}): Course => ({ id, title: id, provider: "x", url: "https://x", language: "en", cost: "free", skills, level: "beginner", sources: [], verification: "verified", ...extra });

describe("gap analysis (spec example)", () => {
  const p = { ...emptyProfile(), skills: [
    { skill_id: "html", level: 2 as const, status: "evidence-attached" as const, evidence: [] },
    { skill_id: "css", level: 2 as const, status: "evidence-attached" as const, evidence: [] },
    { skill_id: "javascript", level: 1 as const, status: "self-reported" as const, evidence: [] },
  ] };
  it("classifies each requirement", () => {
    const r = assessRole(role, p);
    const s = Object.fromEntries(r.gaps.map((g) => [g.requirement.skill_id, g.status]));
    expect(s).toEqual({ javascript: "below-level", react: "missing", "rest-api": "missing", git: "missing", html: "met" });
    expect(r.ready).toBe(false);
    expect(r.readiness_pct).toBeGreaterThan(0);
    expect(r.readiness_pct).toBeLessThan(50);
  });
  it("orders pathway by prerequisites", () => {
    const r = assessRole(role, p);
    const path = buildPathway(r, p, [course("js", ["javascript"]), course("react", ["react"], { prerequisite_skills: ["javascript"] }), course("api", ["rest-api"]), course("git", ["git"])]);
    const ids = path.map((x) => x.skill_id);
    expect(ids.indexOf("javascript")).toBeLessThan(ids.indexOf("react"));
    expect(ids.indexOf("javascript")).toBeLessThan(ids.indexOf("rest-api"));
    expect(path.find((x) => x.skill_id === "react")?.course?.id).toBe("react");
  });
  it("completing a course does not make a skill met", () => {
    const p2 = { ...p, completed_courses: ["git"] };
    const r = assessRole(role, p2, [course("git", ["git"])]);
    const g = r.gaps.find((x) => x.requirement.skill_id === "git")!;
    expect(g.course_completed).toBe(true);
    expect(g.status).toBe("missing");
  });
  it("self-reported at level needs evidence", () => {
    const p3 = { ...p, skills: [...p.skills, { skill_id: "git", level: 2 as const, status: "self-reported" as const, evidence: [] }] };
    expect(assessRole(role, p3).gaps.find((x) => x.requirement.skill_id === "git")!.status).toBe("needs-evidence");
  });
});

describe("scholarships", () => {
  const s = (o: Partial<Scholarship>): Scholarship => ({ id: "s", name_en: "s", provider: "x", kind: "scholarship", eligibility_text: "", criteria: {}, url: "https://x", sources: [], verification: "verified", ...o });
  it("blocks below minimum, keeps need-based relevant", () => {
    const p = { ...emptyProfile(), tawjihi_avg: 75, financial_need: true };
    const r = matchScholarships(p, [s({ id: "merit", criteria: { min_avg: 90 } }), s({ id: "need", criteria: { need_based: true } })]);
    expect(r[0].item.id).toBe("need");
    expect(r[0].status).toBe("likely-relevant");
    expect(r[1].status).toBe("not-eligible");
  });
});

describe("priorities", () => {
  it("affordability priority lifts a cheap program above a pricier city match", () => {
    const base = { ...emptyProfile(), tawjihi_avg: 85, interests: ["computer-science"], preferred_cities: ["Amman"], budget_jod_per_year: 4000 };
    const progs = [
      prog({ id: "cheap", university_id: "u2", min_admission_avg: 65, credit_hours: 132, tuition_jod_per_credit_hour: 40 }),
      prog({ id: "city", university_id: "u1", min_admission_avg: 65, credit_hours: 132, tuition_jod_per_credit_hour: 90 }),
    ];
    const unis = [uni("u1", "Amman"), uni("u2", "Irbid")];
    expect(rankPrograms({ ...base, priorities: ["location"] }, progs, unis)[0].program.id).toBe("city");
    expect(rankPrograms({ ...base, priorities: ["affordability"] }, progs, unis)[0].program.id).toBe("cheap");
  });
});

describe("learning priority and evidence", () => {
  it("ranks essential gaps high and nice-to-haves low", async () => {
    const { learningPriority } = await import("@/lib/engines/gap");
    expect(learningPriority("missing", true)).toBe("high");
    expect(learningPriority("needs-evidence", true)).toBe("medium");
    expect(learningPriority("needs-evidence", false)).toBe("low");
    expect(learningPriority("met", true)).toBe("none");
  });
  it("counts evidence per skill", () => {
    const p = { ...emptyProfile(), skills: [{ skill_id: "git", level: 2 as const, status: "evidence-attached" as const, evidence: [{ kind: "link" as const, value: "https://x" }, { kind: "quote" as const, value: "q" }] }] };
    const g = assessRole(role, p).gaps.find((x) => x.requirement.skill_id === "git")!;
    expect(g.evidence).toEqual({ quotes: 1, links: 1, files: 0 });
  });
});
