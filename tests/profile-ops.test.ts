import { describe, it, expect } from "vitest";
import { attachEvidence, mergeSkill, isHttpUrl } from "@/lib/profile-ops";
import { emptyProfile } from "@/lib/types";

describe("profile ops", () => {
  it("merging keeps the higher level and never downgrades evidence", () => {
    let p = mergeSkill(emptyProfile(), { skill_id: "git", level: 1, status: "evidence-attached", evidence: [{ kind: "link", value: "https://a" }] });
    p = mergeSkill(p, { skill_id: "git", level: 2, status: "self-reported", evidence: [] });
    expect(p.skills[0]).toMatchObject({ level: 2, status: "evidence-attached" });
  });
  it("attaching a link upgrades self-reported to evidence-attached only", () => {
    let p = mergeSkill(emptyProfile(), { skill_id: "react", level: 2, status: "self-reported", evidence: [] });
    p = attachEvidence(p, "react", "https://github.com/x/y");
    expect(p.skills[0]).toMatchObject({ level: 2, status: "evidence-attached" });
    expect(p.skills[0].evidence).toHaveLength(1);
  });
  it("validates urls", () => {
    expect(isHttpUrl("https://github.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
