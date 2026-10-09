import { describe, it, expect } from "vitest";
import { checkEligibility, estimateCost, rankPrograms } from "@/lib/engines/programs";
import { buildPathway, compareRole, findCycles, rankCourses } from "@/lib/engines/gap";
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

const st = (c: ReturnType<typeof compareRole>, id: string) => c.checks.find((x) => x.skill_id === id)!;

describe("role comparison (spec example)", () => {
  const p = { ...emptyProfile(), skills: [
    { skill_id: "html", level: 2 as const, status: "evidence-attached" as const, evidence: [] },
    { skill_id: "css", level: 2 as const, status: "evidence-attached" as const, evidence: [] },
    { skill_id: "javascript", level: 1 as const, status: "self-reported" as const, evidence: [] },
  ] };
  it("states what is known about each requirement", () => {
    const c = compareRole(role.requirements, p);
    expect(c.status).toBe("compared");
    expect(st(c, "javascript")).toMatchObject({ state: "self-reported", level_ok: false });
    expect(st(c, "react")).toMatchObject({ state: "none-recorded", level_ok: null });
    expect(st(c, "html")).toMatchObject({ state: "evidence-attached", level_ok: true, importance: "preferred" });
    expect(c.counts).toMatchObject({ required: 4, required_recorded: 0, preferred: 1, preferred_recorded: 1 });
    expect(c.next_action.kind).toBe("learn");
  });
  it("orders the plan so prerequisites come first", () => {
    const c = compareRole(role.requirements, p);
    const path = buildPathway(c, p, [course("js", ["javascript"]), course("react", ["react"], { prerequisite_skills: ["javascript"] }), course("api", ["rest-api"]), course("git", ["git"])]);
    const ids = path.map((x) => x.skill_id);
    expect(ids.indexOf("javascript")).toBeLessThan(ids.indexOf("react"));
    expect(ids.indexOf("javascript")).toBeLessThan(ids.indexOf("rest-api"));
    expect(path.find((x) => x.skill_id === "react")?.course?.id).toBe("react");
  });
  it("completing a course does not record the skill", () => {
    const c = compareRole(role.requirements, { ...p, completed_courses: ["git"] }, [course("git", ["git"])]);
    expect(st(c, "git")).toMatchObject({ course_completed: true, state: "none-recorded" });
    expect(c.counts.required_recorded).toBe(0);
  });
  it("self-reported at the level is recorded but has no work attached", () => {
    const p3 = { ...p, skills: [...p.skills, { skill_id: "git", level: 2 as const, status: "self-reported" as const, evidence: [] }] };
    const c = compareRole(role.requirements, p3);
    expect(st(c, "git")).toMatchObject({ state: "self-reported", level_ok: true });
    expect(c.counts.required_recorded).toBe(1);
    expect(c.counts.required_with_evidence).toBe(0);
  });
});

describe("comparison invariants", () => {
  const skill = (skill_id: string, level: 1 | 2 | 3, status: "self-reported" | "evidence-attached" | "reviewed" = "self-reported") => ({ skill_id, level, status, evidence: [] });
  it("an empty profile gets no credit and is told to describe experience", () => {
    const c = compareRole(role.requirements, emptyProfile());
    expect(c.status).toBe("no-experience-recorded");
    expect(c.counts).toEqual({ required: 4, required_recorded: 0, required_with_evidence: 0, required_reviewed: 0, preferred: 1, preferred_recorded: 0 });
    expect(c.next_action.kind).toBe("describe-experience");
    expect(JSON.stringify(c)).not.toMatch(/pct|percent|score/);
  });
  it("no confirmed requirements means not enough information, never ready", () => {
    for (const reqs of [[], [{ skill_id: "python", level: 2 as const, mandatory: false, importance: "unclear" as const }], [{ skill_id: null, level: 1 as const, mandatory: true, label: "SAP" }]]) {
      const c = compareRole(reqs, { ...emptyProfile(), skills: [skill("python", 3, "reviewed")] });
      expect(c.status).toBe("insufficient-requirements");
      expect(c.next_action.kind).toBe("confirm-requirements");
      expect(c.checks).toHaveLength(0);
    }
  });
  it("duplicates count once and keep the stricter level", () => {
    const c = compareRole([{ skill_id: "sql", level: 1, mandatory: false }, { skill_id: "sql", level: 2, mandatory: true }], { ...emptyProfile(), skills: [skill("sql", 1)] });
    expect(c.checks).toHaveLength(1);
    expect(c.checks[0]).toMatchObject({ importance: "required", level_needed: 2, level_ok: false });
  });
  it("alternatives: any one is enough", () => {
    const reqs = [{ skill_id: "python", level: 2 as const, mandatory: true, alt_group: "g1" }, { skill_id: "r-lang", level: 2 as const, mandatory: true, alt_group: "g1" }];
    const c = compareRole(reqs, { ...emptyProfile(), skills: [skill("r-lang", 2, "evidence-attached")] });
    expect(c.checks).toHaveLength(1);
    expect(c.checks[0].skill_id).toBe("r-lang");
    expect(c.counts).toMatchObject({ required: 1, required_recorded: 1, required_with_evidence: 1 });
  });
  it("not-required items are excluded, never compared or learned", () => {
    const c = compareRole([{ skill_id: "react", level: 2, mandatory: false, importance: "not-required" }, { skill_id: "sql", level: 1, mandatory: true }], { ...emptyProfile(), skills: [skill("sql", 1)] });
    expect(c.excluded.map((x) => x.skill_id)).toEqual(["react"]);
    expect(buildPathway(c, emptyProfile(), []).map((x) => x.skill_id)).not.toContain("react");
  });
  it("personal details cannot change the comparison", () => {
    const base = { ...emptyProfile(), skills: [skill("javascript", 2)] };
    const other = { ...base, name: "X", tawjihi_avg: 99, preferred_cities: ["Aqaba"], financial_need: true, accessibility_needs: ["screen reader"] };
    expect(compareRole(role.requirements, other)).toEqual(compareRole(role.requirements, base));
  });
  it("an attached link is not the same as reviewed", () => {
    const c = compareRole(role.requirements, { ...emptyProfile(), skills: [skill("git", 2, "evidence-attached")] });
    expect(c.counts.required_with_evidence).toBe(1);
    expect(c.counts.required_reviewed).toBe(0);
    expect(c.next_action.kind).toBe("learn"); // other required gaps first
  });
  it("adding experience never lowers any count", () => {
    const a = compareRole(role.requirements, { ...emptyProfile(), skills: [skill("javascript", 2)] }).counts;
    const b = compareRole(role.requirements, { ...emptyProfile(), skills: [skill("javascript", 2, "evidence-attached"), skill("react", 2)] }).counts;
    for (const k of Object.keys(a) as (keyof typeof a)[]) expect(b[k]).toBeGreaterThanOrEqual(a[k]);
  });
});

describe("practice plan", () => {
  it("the skill dependency graph has no cycles", () => {
    expect(findCycles()).toEqual([]);
  });
  it("every step comes after the steps it depends on", () => {
    const all = ["html", "css", "javascript", "react", "rest-api", "git", "sql", "python"].map((skill_id) => ({ skill_id, level: 2 as const, mandatory: true }));
    const c = compareRole(all, { ...emptyProfile(), skills: [{ skill_id: "excel", level: 1 as const, status: "self-reported" as const }] });
    const path = buildPathway(c, emptyProfile(), []);
    const pos = new Map(path.map((s, i) => [s.skill_id, i]));
    for (const s of path) for (const d of [...s.prerequisites, ...s.builds_on]) if (pos.has(d)) expect(pos.get(d)!).toBeLessThan(pos.get(s.skill_id)!);
    expect(new Set(path.map((s) => s.skill_id)).size).toBe(path.length);
  });
  it("prefers the smallest relevant course in the person's language", () => {
    const cs = [course("big", ["python", "sql", "react", "git"], { est_hours: 300 }), course("small", ["python"], { est_hours: 12 }), course("ar", ["python"], { est_hours: 12, language: "ar" })];
    expect(rankCourses("python", cs, { lang: "en", level: 1, needed: new Set(["python"]) })[0].id).toBe("small");
    expect(rankCourses("python", cs, { lang: "ar", level: 1, needed: new Set(["python"]) })[0].id).toBe("ar");
  });
  it("self-reported skills get a show-your-work step, not a course", () => {
    const c = compareRole([{ skill_id: "git", level: 2, mandatory: true }], { ...emptyProfile(), skills: [{ skill_id: "git", level: 2 as const, status: "self-reported" as const }] });
    const [step] = buildPathway(c, emptyProfile(), [course("git", ["git"])]);
    expect(step).toMatchObject({ kind: "show", course: undefined });
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
