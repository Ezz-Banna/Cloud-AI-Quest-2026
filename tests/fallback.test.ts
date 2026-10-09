import { describe, it, expect } from "vitest";
import { fallbackJob, fallbackProfile, fallbackSkills, quoteInText } from "@/lib/ai/fallback";

describe("offline fallbacks", () => {
  it("reads an Arabic profile conservatively", () => {
    const d = fallbackProfile("معدلي ٨٧.٥ في الفرع العلمي وأحب البرمجة وأسكن في إربد وميزانيتي 2500 دينار");
    expect(d.tawjihi_avg).toBe(87.5);
    expect(d.stream).toBe("scientific");
    expect(d.interests).toContain("computer-science");
    expect(d.preferred_cities).toContain("Irbid");
    expect(d.budget_jod_per_year).toBe(2500);
  });
  it("does not invent an average", () => {
    expect(fallbackProfile("I like biology and want to be a doctor").tawjihi_avg).toBeNull();
  });
  it("extracts skills with quotes from the text", () => {
    const text = "Built a personal website with HTML and CSS. Added a quiz in JavaScript.";
    const s = fallbackSkills(text);
    expect(s.map((x) => x.skill_id).sort()).toEqual(["css", "html", "javascript"]);
    for (const x of s) expect(quoteInText(x.quote, text)).toBe(true);
  });
  it("parses mandatory vs preferred job requirements", () => {
    const j = fallbackJob("Junior Frontend Developer\nRequired: JavaScript, React\nExperience integrating REST APIs\nGit\nTypeScript is a plus");
    const by = Object.fromEntries(j.requirements.map((r) => [r.skill_id, r.mandatory]));
    expect(by).toMatchObject({ javascript: true, react: true, "rest-api": true, git: true, typescript: false });
  });
  it("quote check rejects fabricated quotes", () => {
    expect(quoteInText("won a national award", "I built a website")).toBe(false);
  });
});
