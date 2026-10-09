import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/log", () => ({ logAI: () => {}, readAILog: () => [] }));
const structured = vi.fn();
vi.mock("@/lib/ai/client", () => ({ structured: (...a: unknown[]) => structured(...a) }));

import { extractSkills, interpretProfile, parseJob, compareOptions, extractCurriculum } from "@/lib/ai/modules";

beforeEach(() => structured.mockReset());

describe("AI module guards (model output mocked)", () => {
  it("drops skills whose quote is not in the student's text", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 5, data: {
      skills: [
        { skill_id: "html", level: 2, quote: "built my website with HTML", rationale: "" },
        { skill_id: "react", level: 3, quote: "led a React team at a bank", rationale: "" },
      ], suggested_description: "x" } });
    const r = await extractSkills("Site", "I built my website with HTML and CSS.", []);
    expect(r.skills.map((s) => s.skill_id)).toEqual(["html"]);
    expect(r.dropped_unsupported).toBe(1);
  });
  it("nulls a Tawjihi average that the student never wrote", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 5, data: {
      tawjihi_avg: 92, stream: null, interests: [], dream_careers: [], career_tags: [], budget_jod_per_year: null, financial_need: null,
      preferred_cities: [], open_to_relocate: null, university_type: "any", accessibility_needs: [], strengths: [], clarifications: [] } });
    const r = await interpretProfile([{ q: "results", a: "I did well, scientific stream" }]);
    expect(r.draft.tawjihi_avg).toBeNull();
  });
  it("keeps an average written with Arabic digits", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 5, data: {
      tawjihi_avg: 87.5, stream: "scientific", interests: [], dream_careers: [], career_tags: [], budget_jod_per_year: null, financial_need: null,
      preferred_cities: [], open_to_relocate: null, university_type: "any", accessibility_needs: [], strengths: [], clarifications: [] } });
    const r = await interpretProfile([{ q: "results", a: "معدلي ٨٧.٥" }]);
    expect(r.draft.tawjihi_avg).toBe(87.5);
  });
  it("falls back to offline rules when the AI call fails", async () => {
    structured.mockResolvedValue({ ok: false, error: "timeout" });
    const r = await parseJob("Junior dev. Required: JavaScript and Git. React is a plus.");
    expect(r.mode).toBe("offline");
    expect(r.requirements.map((x) => x.skill_id).sort()).toEqual(["git", "javascript", "react"]);
  });
  it("dedupes job requirements and drops unquoted ones", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 5, data: { title: "Dev", unmapped: [], requirements: [
      { skill_id: "git", level: 1, mandatory: false, quote: "Git" },
      { skill_id: "git", level: 2, mandatory: true, quote: "Required: Git" },
      { skill_id: "python", level: 2, mandatory: true, quote: "Python required" },
    ] } });
    const r = await parseJob("Junior dev. Required: Git. Nice to have: Git hooks experience.");
    expect(r.requirements).toEqual([{ skill_id: "git", level: 2, mandatory: true, quote: "Required: Git" }]);
  });
});

import { explainMatch, numbersSupported } from "@/lib/ai/modules";
describe("explanation guard", () => {
  const facts = { program: "CS", university: "JUST", city: "Irbid", eligibility: { status: "meets-published-minimum", published_min: 65, year: "2024", student_avg: 86.4 }, fit_score: 74, tuition_per_year_jod: 1089, reasons: [{ code: "interest-match", text: "Matches" }], missing: [] };
  it("rejects invented numbers", () => {
    expect(numbersSupported("Fees are 1089 JOD and graduates earn 900 JOD", facts)).toBe(false);
    expect(numbersSupported("Your 86.4 meets 65", facts)).toBe(true);
  });
  it("falls back to the template when the AI adds a fact", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 1, data: { text: "Ranked top 3 in Jordan.", used_reason_codes: ["interest-match"] } });
    const r = await explainMatch(facts, "en");
    expect(r.mode).toBe("offline");
    expect(r.text).toContain("JUST");
  });
});

describe("comparison and study-plan guards (model output mocked)", () => {
  const facts = [
    { id: "a", program: "CS", university: "U1", city: "Irbid", eligibility: "meets-published-minimum", fit_score: 80, tuition_per_year_jod: 1089, strengths: ["Close to home"], trade_offs: [], missing: ["study plan"] },
    { id: "b", program: "CS", university: "U2", city: "Amman", eligibility: "meets-published-minimum", fit_score: 70, tuition_per_year_jod: 2970, strengths: ["Public"], trade_offs: ["Above budget"], missing: [] },
  ];
  it("accepts a comparison whose numbers all come from the facts", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 1, data: { text: "U1 costs about 1089 JOD a year, U2 about 2970.", used_program_ids: ["a", "b"] } });
    const r = await compareOptions(facts, "en");
    expect(r.mode).toBe("ai");
  });
  it("replaces a comparison with an invented number or program", async () => {
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 1, data: { text: "U1 has a 95% employment rate.", used_program_ids: ["a"] } });
    expect((await compareOptions(facts, "en")).mode).toBe("offline");
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 1, data: { text: "Consider U3.", used_program_ids: ["zzz"] } });
    expect((await compareOptions(facts, "en")).mode).toBe("offline");
  });
  it("drops study-plan topics whose quote is not in the pasted text", async () => {
    const text = "CS 101 Introduction to Programming\nMATH 101 Calculus I\nCS 490 Practical Training";
    structured.mockResolvedValue({ ok: true, model: "m", latency_ms: 1, data: { topics: [{ topic_id: "programming", quote: "Introduction to Programming" }, { topic_id: "ai", quote: "Machine Learning" }], internship_quote: "Practical Training" } });
    const r = await extractCurriculum(text);
    expect(r.topics.map((t) => t.topic_id)).toEqual(["programming"]);
    expect(r.dropped).toBe(1);
    expect(r.internship_quote).toBe("Practical Training");
  });
  it("falls back to keyword rules for study plans when the AI is unavailable", async () => {
    structured.mockResolvedValue({ ok: false, error: "no-key" });
    const r = await extractCurriculum("Database Systems\nComputer Networks and Security\nField Training (internship)");
    expect(r.mode).toBe("offline");
    expect(r.topics.map((t) => t.topic_id)).toEqual(expect.arrayContaining(["data", "networks-security"]));
    expect(r.internship_quote).toMatch(/internship/);
  });
});
