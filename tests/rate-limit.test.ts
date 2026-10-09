import { describe, it, expect } from "vitest";
import { RULES, SlidingWindowLimiter, clientIp, ruleFor } from "@/lib/rate-limit";

describe("sliding-window rate limiter", () => {
  it("allows 5 admin logins per 15 minutes, then returns a retry time", () => {
    const l = new SlidingWindowLimiter();
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(l.check(RULES.adminLogin, "1.2.3.4", t0 + i * 1000).ok).toBe(true);
    const r = l.check(RULES.adminLogin, "1.2.3.4", t0 + 10_000);
    expect(r.ok).toBe(false);
    // The first attempt leaves the window 15 minutes after it was made.
    expect(r.retryAfterSec).toBe(15 * 60 - 10);
    expect(l.check(RULES.adminLogin, "1.2.3.4", t0 + 15 * 60_000 + 1).ok).toBe(true);
  });
  it("slides rather than resetting at fixed boundaries", () => {
    const l = new SlidingWindowLimiter();
    const rule = { name: "t", limit: 2, windowMs: 1000 };
    expect(l.check(rule, "a", 0).ok).toBe(true);
    expect(l.check(rule, "a", 900).ok).toBe(true);
    expect(l.check(rule, "a", 999).ok).toBe(false);
    expect(l.check(rule, "a", 1000).ok).toBe(true); // the hit at 0 has left the window
    expect(l.check(rule, "a", 1500).ok).toBe(false); // hits at 900 and 1000 are still inside
  });
  it("blocked requests do not extend the block", () => {
    const l = new SlidingWindowLimiter();
    const rule = { name: "t", limit: 1, windowMs: 1000 };
    l.check(rule, "a", 0);
    for (let t = 100; t < 1000; t += 100) expect(l.check(rule, "a", t).ok).toBe(false);
    expect(l.check(rule, "a", 1001).ok).toBe(true);
  });
  it("counts clients and buckets separately", () => {
    const l = new SlidingWindowLimiter();
    for (let i = 0; i < 20; i++) l.check(RULES.ai, "a", 0);
    expect(l.check(RULES.ai, "a", 1).ok).toBe(false);
    expect(l.check(RULES.ai, "b", 1).ok).toBe(true);
    expect(l.check(RULES.apiWrite, "a", 1).ok).toBe(true);
  });
  it("picks the right rule per path and method", () => {
    expect(ruleFor("POST", "/api/admin/login")).toBe(RULES.adminLogin);
    expect(ruleFor("POST", "/api/ai/profile")).toBe(RULES.ai);
    expect(ruleFor("GET", "/api/ai/profile")).toBe(RULES.ai);
    expect(ruleFor("POST", "/api/match/programs")).toBe(RULES.apiWrite);
    expect(ruleFor("GET", "/api/status")).toBeNull();
    expect(ruleFor("POST", "/discover")).toBeNull();
  });
  it("uses the first X-Forwarded-For hop as the client IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
