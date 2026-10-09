// Blind held-out set (written without access to the extractor or the v1 fixtures). This is a measurement, not a
// gate: precision and recall over (skill, importance) pairs are reported and written to tests/results/, and the
// test only fails if the fixture file is malformed. Do not tune the extractor against these cases.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import heldout from "./fixtures/job-postings.heldout.v1.json";
import { extractRequirements } from "@/lib/engines/requirements";

type Case = { id: string; text: string; expect: Record<string, string>; absent?: string[]; groups?: string[][] };

describe("job posting held-out set (blind)", () => {
  it("reports precision and recall", () => {
    let tp = 0, fp = 0, fn = 0, groupsOk = 0, groupsAll = 0;
    const misses: string[] = [];
    for (const c of heldout.cases as unknown as Case[]) {
      expect(typeof c.text).toBe("string");
      const x = extractRequirements(c.text);
      const got = Object.fromEntries(x.items.filter((i) => i.skill_id).map((i) => [i.skill_id!, i.importance]));
      for (const [k, v] of Object.entries(c.expect)) { if (got[k] === v) tp++; else { fn++; misses.push(`${c.id}: ${k} expected ${v}, got ${got[k] ?? "nothing"}`); } }
      for (const [k, v] of Object.entries(got)) if (!(k in c.expect) && (v === "required" || v === "preferred")) { fp++; misses.push(`${c.id}: unexpected ${k} as ${v}`); }
      for (const g of c.groups ?? []) { groupsAll++; const ids = x.items.filter((i) => g.includes(i.skill_id ?? "")).map((i) => i.alt_group); if (ids.length === g.length && ids[0] && new Set(ids).size === 1) groupsOk++; else misses.push(`${c.id}: alternatives ${g.join("/")} not grouped`); }
    }
    const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
    const out = { set: "job-postings.heldout.v1", cases: heldout.cases.length, tp, fp, fn, precision: +precision.toFixed(3), recall: +recall.toFixed(3), alternative_groups: `${groupsOk}/${groupsAll}`, misses };
    fs.mkdirSync("tests/results", { recursive: true });
    fs.writeFileSync("tests/results/job-heldout.json", JSON.stringify(out, null, 2));
    console.log(`held-out: ${out.cases} cases, tp=${tp} fp=${fp} fn=${fn}, precision=${out.precision}, recall=${out.recall}, groups=${out.alternative_groups}`);
  });
});
