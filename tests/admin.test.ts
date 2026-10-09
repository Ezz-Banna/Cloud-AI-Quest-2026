import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
import { checkPassword, issueToken, verifyToken } from "@/lib/admin";

describe("admin auth", () => {
  beforeEach(() => { process.env.ADMIN_PASSWORD = "correct horse"; });
  it("checks the password", () => {
    expect(checkPassword("correct horse")).toBe(true);
    expect(checkPassword("wrong")).toBe(false);
  });
  it("issues tokens that verify and expire", () => {
    const t = issueToken(1_000)!;
    expect(verifyToken(t, 2_000)).toBe(true);
    expect(verifyToken(t, 1_000 + 9 * 3600 * 1000)).toBe(false);
    expect(verifyToken(t.replace(/.$/, "0") === t ? t.replace(/.$/, "1") : t.replace(/.$/, "0"), 2_000)).toBe(false);
  });
  it("is disabled without a configured password", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(issueToken()).toBeNull();
    expect(checkPassword("")).toBe(false);
  });
});
