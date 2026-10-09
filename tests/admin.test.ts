import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
import { checkPassword, issueToken, revokeToken, verifyToken, SESSION_TTL_MS, adminCookieOptions } from "@/lib/admin";

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

describe("admin sessions", () => {
  beforeEach(() => { process.env.ADMIN_PASSWORD = "correct horse"; });
  it("expires exactly after 8 hours", () => {
    const now = Date.now();
    const t = issueToken(now)!;
    expect(SESSION_TTL_MS).toBe(8 * 3600 * 1000);
    expect(verifyToken(t, now + SESSION_TTL_MS - 1)).toBe(true);
    expect(verifyToken(t, now + SESSION_TTL_MS + 1)).toBe(false);
  });
  it("invalidates a session on logout, without touching other sessions", () => {
    const a = issueToken()!;
    const b = issueToken()!;
    expect(verifyToken(a)).toBe(true);
    revokeToken(a);
    expect(verifyToken(a)).toBe(false);
    expect(verifyToken(b)).toBe(true);
  });
  it("rejects a correctly signed token whose session is unknown to this process (e.g. after a restart)", () => {
    const t = issueToken()!;
    const [exp, , sig] = t.split(".");
    expect(verifyToken(`${exp}.forged-session-id.${sig}`)).toBe(false);
    revokeToken(t);
    expect(verifyToken(t)).toBe(false);
  });
  it("rejects tokens after the password changes", () => {
    const t = issueToken()!;
    process.env.ADMIN_PASSWORD = "new password";
    expect(verifyToken(t)).toBe(false);
  });
  it("rejects a token whose expiry was edited", () => {
    const now = Date.now();
    const t = issueToken(now)!;
    const [exp, sid, sig] = t.split(".");
    expect(verifyToken(`${Number(exp) + 1000}.${sid}.${sig}`, now)).toBe(false);
  });
  it("ignores malformed tokens and revokes safely", () => {
    for (const bad of [undefined, "", "abc", "1.2", "1.2.3.4", "x.y.z"]) expect(verifyToken(bad)).toBe(false);
    expect(() => revokeToken(undefined)).not.toThrow();
    expect(() => revokeToken("garbage")).not.toThrow();
  });
  it("sets HttpOnly, SameSite=Strict, 8h cookies, Secure in production", () => {
    const o = adminCookieOptions();
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("strict");
    expect(o.maxAge).toBe(8 * 3600);
    vi.stubEnv("NODE_ENV", "production");
    expect(adminCookieOptions().secure).toBe(true);
    vi.unstubAllEnvs();
  });
});
