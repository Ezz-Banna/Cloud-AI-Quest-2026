// Versioned fixture evaluation for job-posting reading (tests/fixtures/job-postings.v1.json).
// Reports precision and recall over (skill, importance) pairs separately; every critical fixture must pass exactly.
import { describe, it, expect } from "vitest";
import fixtures from "./fixtures/job-postings.v1.json";
import { extractRequirements } from "@/lib/engines/requirements";
import { quoteInText } from "@/lib/ai/fallback";

type Case = (typeof fixtures.cases)[number] & { expect?: Record<string, string>; absent?: string[]; groups?: string[][]; nogroup?: boolean; flags?: Record<string, string[]>; unsupported?: Record<string, string>; unsupported_any?: boolean; empty?: boolean; levels?: Record<string, number>; suspicious?: number };

describe("job posting fixtures v1", () => {
  let tp = 0, fp = 0, fn = 0;
  for (const c of fixtures.cases as Case[]) {
    it(`${c.critical ? "[critical] " : ""}${c.id}`, () => {
      const x = extractRequirements(c.text);
      const got = Object.fromEntries(x.items.filter((i) => i.skill_id).map((i) => [i.skill_id!, i.importance]));
      for (const i of x.items) expect(quoteInText(i.quote, c.text), `quote for ${i.label} must exist in the text`).toBe(true);
      for (const [k, v] of Object.entries(c.expect ?? {})) {
        if (got[k] === v) tp++; else fn++;
        expect(got[k], `${k}`).toBe(v);
      }
      for (const [k, v] of Object.entries(got)) if (!(k in (c.expect ?? {})) && (v === "required" || v === "preferred")) { fp++; expect.soft(v, `unexpected ${k}`).toBeUndefined(); }
      for (const k of c.absent ?? []) expect(["required", "preferred"]).not.toContain(got[k]);
      for (const g of c.groups ?? []) {
        const ids = x.items.filter((i) => g.includes(i.skill_id ?? "")).map((i) => i.alt_group);
        expect(ids.length).toBe(g.length);
        expect(ids[0]).toBeTruthy();
        expect(new Set(ids).size).toBe(1);
      }
      if (c.nogroup) expect(x.items.every((i) => !i.alt_group)).toBe(true);
      for (const [k, fl] of Object.entries(c.flags ?? {})) expect(x.items.find((i) => i.skill_id === k)?.flags).toEqual(expect.arrayContaining(fl));
      for (const [label, imp] of Object.entries(c.unsupported ?? {})) {
        const u = x.items.find((i) => !i.skill_id && i.label === label);
        expect(u, `unsupported ${label} kept for review`).toBeTruthy();
        expect(u!.importance).toBe(imp);
        expect(u!.flags).toContain("not-in-skill-list");
      }
      if (c.unsupported_any) expect(x.items.some((i) => !i.skill_id)).toBe(true);
      if (c.empty) expect(x.items.length).toBe(0);
      if (c.suspicious) expect(x.suspicious.length).toBe(c.suspicious);
      for (const [k, lv] of Object.entries(c.levels ?? {})) expect(x.items.find((i) => i.skill_id === k)?.level).toBe(lv);
    });
  }
  it("reports precision and recall over (skill, importance) pairs", () => {
    const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
    console.log(`job fixtures v1: ${fixtures.cases.length} cases, tp=${tp} fp=${fp} fn=${fn}, precision=${precision.toFixed(3)}, recall=${recall.toFixed(3)}`);
    expect(fp).toBe(0);
  });
});
