// Grounding checks against the real seed data (data/verified, data/synthetic). Personas are synthetic.
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getCourses, getPrograms, getRoles, getUniversities } from "@/lib/data/repo";
import { rankPrograms } from "@/lib/engines/programs";
import { assessRole, buildPathway } from "@/lib/engines/gap";
import { templateExplanation, numbersSupported } from "@/lib/ai/modules";
import { SKILL_BY_ID } from "@/lib/data/taxonomy";
import { DEMO_PROFILE } from "@/lib/demo";
import { emptyProfile, type LearnerProfile } from "@/lib/types";

const PERSONAS: LearnerProfile[] = [
  DEMO_PROFILE,
  { ...emptyProfile(), tawjihi_avg: 72, stream: "scientific", interests: ["medicine"], dream_careers: ["doctor"], budget_jod_per_year: 1500 },
  { ...emptyProfile(), tawjihi_avg: 95, stream: "scientific", interests: ["pharmacy", "nursing"], preferred_cities: ["Zarqa"], open_to_relocate: false, language: "ar" },
  { ...emptyProfile(), tawjihi_avg: 64, stream: "literary", interests: ["business-administration"], budget_jod_per_year: 1000 },
  { ...emptyProfile(), stream: "it" },
];

describe("real dataset grounding", () => {
  const programs = getPrograms(), unis = getUniversities();
  it("every ranked number traces to a stored record, and explanations only use engine facts", () => {
    for (const p of PERSONAS) {
      const r = rankPrograms(p, programs, unis);
      expect(r.length).toBe(programs.length);
      for (const m of r) {
        const prog = programs.find((x) => x.id === m.program.id)!;
        // eligibility uses the stored minimum, never another number
        if (m.eligibility.published_min != null) expect(m.eligibility.published_min).toBe(prog.min_admission_avg);
        if (m.eligibility.status === "meets-published-minimum") expect(p.tawjihi_avg!).toBeGreaterThanOrEqual(prog.min_admission_avg!);
        if (m.eligibility.status === "below-published-minimum") expect(p.tawjihi_avg!).toBeLessThan(prog.min_admission_avg!);
        // cost only from stored fee × credit hours
        if (m.cost.total_tuition_jod != null) expect(m.cost.total_tuition_jod).toBe(Math.round(prog.credit_hours! * prog.tuition_jod_per_credit_hour!));
        else expect(prog.credit_hours == null || prog.tuition_jod_per_credit_hour == null).toBe(true);
        expect(Math.abs(m.factors.reduce((s, f) => s + f.points, 0) - m.suitability)).toBeLessThanOrEqual(1);
        // alternatives point at real, eligible programs
        for (const a of m.alternatives) expect(programs.some((x) => x.id === a.program_id)).toBe(true);
        const lang = p.language;
        const facts = { program: prog.name_en, university: m.university.name_en, city: m.university.city ?? null,
          eligibility: { status: m.eligibility.status, published_min: m.eligibility.published_min, year: m.eligibility.year, student_avg: p.tawjihi_avg },
          fit_score: m.suitability, tuition_per_year_jod: m.cost.per_year_jod, reasons: m.reasons.map((x) => ({ code: x.code, text: lang === "ar" ? x.ar : x.en })),
          missing: m.missing_data, trade_offs: m.trade_offs.map((x) => ({ code: x.code, text: lang === "ar" ? x.ar : x.en })) };
        expect(numbersSupported(templateExplanation(facts, lang), facts)).toBe(true);
      }
    }
  });
  it("skills-gap and pathway only use taxonomy skills and catalogued courses", () => {
    const courses = getCourses();
    for (const role of getRoles()) {
      const rd = assessRole(role, DEMO_PROFILE, courses);
      for (const g of rd.gaps) expect(SKILL_BY_ID[g.requirement.skill_id]).toBeDefined();
      for (const step of buildPathway(rd, DEMO_PROFILE, courses, role.recommended_course_ids ?? [])) {
        expect(SKILL_BY_ID[step.skill_id]).toBeDefined();
        if (step.course) expect(courses.some((c) => c.id === step.course!.id && c.url === step.course!.url)).toBe(true);
      }
    }
  });
});
