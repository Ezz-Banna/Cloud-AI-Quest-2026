// The seed data must pass the same checks as `npm run validate:data`, and the checks themselves must catch bad rows.
import { describe, it, expect } from "vitest";
import universities from "../data/verified/universities.json";
import programs from "../data/verified/programs.json";
import scholarships from "../data/verified/scholarships.json";
import { validateData } from "../scripts/validate-data.mjs";
import { effectiveAvailability, matchScholarships } from "@/lib/engines/scholarships";
import { emptyProfile, type Scholarship } from "@/lib/types";

type Issue = { check: string; id: string };
const run = (d: object, today = "2026-10-10") => validateData({ universities, programs, scholarships, ...d }, today) as { errors: Issue[]; warnings: Issue[] };

describe("data validation", () => {
  it("seed data has no validation errors", () => {
    expect(run({}).errors).toEqual([]);
  });
  it("catches duplicates, implausible fees, wrong currency and outdated deadlines", () => {
    const p = programs[0];
    const bad = run({
      programs: [...programs, { ...p, id: "dup" }, { ...p, id: "usd", name_en: "Test USD", tuition_jod_per_credit_hour: 1300 }, { ...p, id: "x", name_en: "Total", credit_hours: 132, tuition_jod_per_credit_hour: 5 }],
      scholarships: [...scholarships, { ...scholarships[0], id: "late", availability: { status: "open", academic_year: "2025/2026", opens: "2025-09-01", closes: "2025-10-01" } }],
    });
    const checks = bad.errors.map((e) => `${e.id}:${e.check}`);
    expect(checks).toContain("dup:duplicate-program");
    expect(checks).toContain("usd:implausible-fee");
    expect(checks).toContain("x:implausible-total");
    expect(checks).toContain("late:outdated-deadline");
  });
});

describe("scholarship availability", () => {
  const base = scholarships[0] as unknown as Scholarship;
  it("a stored 'open' with a past deadline is treated as closed and never recommended", () => {
    const s: Scholarship = { ...base, id: "t", availability: { status: "open", opens: "2026-01-01", closes: "2026-03-01", academic_year: "2025/2026" } };
    expect(effectiveAvailability(s, "2026-10-10")).toBe("closed");
    const [m] = matchScholarships({ ...emptyProfile(), tawjihi_avg: 95, financial_need: true }, [s], "pre-university", "2026-10-10");
    expect(m.window).toBe("closed");
    expect(m.status).not.toBe("likely-relevant");
  });
  it("'open' needs published dates; missing status is unverified", () => {
    expect(effectiveAvailability({ ...base, availability: { status: "open" } }, "2026-10-10")).toBe("unverified");
    expect(effectiveAvailability({ ...base, availability: null }, "2026-10-10")).toBe("unverified");
    expect(effectiveAvailability({ ...base, availability: { status: "open", opens: "2026-11-01", closes: "2026-12-01" } }, "2026-10-10")).toBe("announced");
  });
});

import coverage from "../src/lib/data/coverage.json";
describe("coverage counts shown in the app", () => {
  it("match the seed data (run npm run audit:data after editing data)", () => {
    expect(coverage.programs.total).toBe(programs.length);
    expect(coverage.universities.total).toBe(universities.length);
    expect(coverage.scholarships.total).toBe(scholarships.length);
    expect(coverage.programs.verified).toBe(programs.filter((p) => p.verification === "verified").length);
  });
});
