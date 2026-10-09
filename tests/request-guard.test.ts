import { describe, it, expect } from "vitest";
import { bodyLimitFor, needsOriginCheck, originAllowed } from "@/lib/request-guard";

const h = (o: Record<string, string>) => new Headers(o);

describe("CSRF origin check", () => {
  it("allows requests without an Origin header", () => {
    expect(originAllowed(h({ host: "bridgecom.onrender.com" }))).toBe(true);
  });
  it("allows a same-origin request", () => {
    expect(originAllowed(h({ host: "bridgecom.onrender.com", origin: "https://bridgecom.onrender.com" }))).toBe(true);
    expect(originAllowed(h({ host: "localhost:3101", origin: "http://localhost:3101" }))).toBe(true);
  });
  it("accepts the forwarded host behind a proxy", () => {
    expect(originAllowed(h({ host: "10.0.0.5:10000", "x-forwarded-host": "bridgecom.onrender.com", origin: "https://bridgecom.onrender.com" }))).toBe(true);
  });
  it("rejects a cross-site origin, a different port, a null origin and junk", () => {
    expect(originAllowed(h({ host: "bridgecom.onrender.com", origin: "https://evil.example" }))).toBe(false);
    expect(originAllowed(h({ host: "localhost:3101", origin: "http://localhost:3000" }))).toBe(false);
    expect(originAllowed(h({ host: "bridgecom.onrender.com", origin: "null" }))).toBe(false);
    expect(originAllowed(h({ host: "bridgecom.onrender.com", origin: "not a url" }))).toBe(false);
    expect(originAllowed(h({ host: "bridgecom.onrender.com", origin: "https://bridgecom.onrender.com.evil.example" }))).toBe(false);
  });
  it("only checks state-changing admin requests", () => {
    expect(needsOriginCheck("POST", "/api/admin/record")).toBe(true);
    expect(needsOriginCheck("DELETE", "/api/admin/record")).toBe(true);
    expect(needsOriginCheck("POST", "/api/data/import")).toBe(true);
    expect(needsOriginCheck("GET", "/api/admin/overview")).toBe(false);
    expect(needsOriginCheck("POST", "/api/match/programs")).toBe(false);
  });
});

describe("body limits", () => {
  it("is 64 KB by default and 2 MB for data import", () => {
    expect(bodyLimitFor("/api/match/programs")).toBe(65536);
    expect(bodyLimitFor("/api/data/import")).toBe(2 * 1024 * 1024);
  });
});
