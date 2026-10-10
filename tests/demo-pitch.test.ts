// The pitch demo: synthetic student Lina and the synthetic trainee role she partly matches.
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { DEMO_PROFILE } from "@/lib/demo";
import { getCandidates, getCourses, getPrograms, getRoles, getUniversities } from "@/lib/data/repo";
import { rankPrograms } from "@/lib/engines/programs";
import { compareRole, comparisonInput } from "@/lib/engines/gap";
import { matchScholarships } from "@/lib/engines/scholarships";
import { getScholarships } from "@/lib/data/repo";

describe("pitch demo data", () => {
  it("Lina is labelled synthetic and her saved programs all exist in the verified data", () => {
    expect(DEMO_PROFILE.name).toMatch(/synthetic/i);
    const ids = new Set(getPrograms().map((p) => p.id));
    for (const id of DEMO_PROFILE.saved_programs) expect(ids.has(id)).toBe(true);
  });
  it("her university results include PSUT and HTU computer science as eligible", () => {
    const r = rankPrograms(DEMO_PROFILE, getPrograms(), getUniversities());
    for (const id of ["psut-cs", "htu-cs"]) expect(r.find((m) => m.program.id === id)?.eligibility.group).toBe("eligible");
  });
  it("she partly matches the synthetic trainee role, so the employer screen has something to show", () => {
    const role = getRoles().find((x) => x.id === "role-web-trainee")!;
    expect(role.verification).toBe("synthetic");
    const c = compareRole(role.requirements, comparisonInput(DEMO_PROFILE), getCourses());
    const req = c.checks.filter((k) => k.importance === "required");
    expect(req.some((k) => k.state !== "none-recorded" && k.level_ok)).toBe(true);
    expect(req.some((k) => k.level_ok === false || k.state === "none-recorded")).toBe(true);
    expect(getCandidates().filter((x) => x.role_id === role.id && x.token_hash === "synthetic").length).toBe(3);
  });
  it("funding matches still run for her (scholarships, grants, loans)", () => {
    expect(matchScholarships(DEMO_PROFILE, getScholarships(), "pre-university").length).toBeGreaterThan(0);
  });
});
