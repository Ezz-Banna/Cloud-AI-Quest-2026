import { describe, it, expect } from "vitest";
import { completeness } from "@/lib/completeness";
import { emptyProfile } from "@/lib/types";
import { DEMO_PROFILE } from "@/lib/demo";

describe("profile completeness", () => {
  it("is 0 for an empty profile", () => expect(completeness(emptyProfile()).pct).toBe(0));
  it("counts the demo student's filled sections", () => {
    const c = completeness(DEMO_PROFILE);
    expect(c.pct).toBeGreaterThan(50);
    expect(c.items.find((i) => i.id === "role")!.done).toBe(false);
  });
});
