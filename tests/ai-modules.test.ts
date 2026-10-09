import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
const structured = vi.fn();
vi.mock("@/lib/ai/client", () => ({ structured: (...a: unknown[]) => structured(...a) }));

import { extractSkills, interpretProfile, parseJob } from "@/lib/ai/modules";

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
