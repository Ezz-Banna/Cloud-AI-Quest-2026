// Access control and data minimisation on the sharing, review and comparison endpoints (route handlers called directly).
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
vi.mock("server-only", () => ({}));
const admin = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/admin", () => ({ isAdmin: async () => admin.on }));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-store-"));
process.env.BRIDGECOM_STORE_PATH = path.join(dir, "store.json");

const json = (url: string, method: string, body?: unknown, token?: string) =>
  new Request(`http://localhost${url}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });

let candidates: typeof import("@/app/api/candidates/route");
let reviews: typeof import("@/app/api/reviews/route");
let adminReviews: typeof import("@/app/api/admin/reviews/route");
let roles: typeof import("@/app/api/roles/route");
let readiness: typeof import("@/app/api/readiness/route");
beforeAll(async () => {
  candidates = await import("@/app/api/candidates/route");
  reviews = await import("@/app/api/reviews/route");
  adminReviews = await import("@/app/api/admin/reviews/route");
  roles = await import("@/app/api/roles/route");
  readiness = await import("@/app/api/readiness/route");
});

const skills = [{ skill_id: "javascript", level: 2, status: "evidence-attached", evidence_count: 1 }];

describe("sharing with a role", () => {
  it("needs explicit consent and a known role", async () => {
    expect((await candidates.POST(json("/api/candidates", "POST", { role_id: "role-frontend-jr", skills, consent: false }))).status).toBe(400);
    expect((await candidates.POST(json("/api/candidates", "POST", { role_id: "nope", skills, consent: true }))).status).toBe(404);
  });
  it("rejects personal fields it does not need", async () => {
    const r = await candidates.POST(json("/api/candidates", "POST", { role_id: "role-frontend-jr", skills, consent: true, tawjihi_avg: 90 }));
    expect(r.status).toBe(400);
  });
  it("an id alone cannot read, update or withdraw a share", async () => {
    const r = await candidates.POST(json("/api/candidates", "POST", { role_id: "role-frontend-jr", skills, consent: true, display_name: "Lina Haddad" }));
    const d = await r.json();
    expect(d.id).toMatch(/^share-/);
    expect(JSON.parse(fs.readFileSync(process.env.BRIDGECOM_STORE_PATH!, "utf8")).candidates[0].token_hash).not.toContain(d.token);
    expect((await candidates.GET(json(`/api/candidates?id=${d.id}`, "GET"))).status).toBe(404);
    expect((await candidates.GET(json(`/api/candidates?id=${d.id}`, "GET", undefined, "wrong"))).status).toBe(404);
    expect((await candidates.DELETE(json(`/api/candidates?id=${d.id}`, "DELETE", undefined, "wrong"))).status).toBe(404);
    expect((await candidates.PUT(json("/api/candidates", "PUT", { id: d.id, skills }))).status).toBe(404);
    expect((await candidates.GET(json(`/api/candidates?id=${d.id}`, "GET", undefined, d.token))).status).toBe(200);
    expect((await candidates.DELETE(json(`/api/candidates?id=${d.id}`, "DELETE", undefined, d.token))).status).toBe(200);
    expect((await candidates.GET(json(`/api/candidates?id=${d.id}`, "GET", undefined, d.token))).status).toBe(404);
  });
  it("employers need the role's manage token; rows have counts, no score or ranking, first name only", async () => {
    const created = await (await roles.POST(json("/api/roles", "POST", { employer_name: "Demo Co", title: "Data intern", kind: "internship", requirements: [{ skill_id: "sql", level: 1, importance: "required" }, { skill_id: null, level: 1, importance: "required", label: "SAP" }] }))).json();
    expect(created.manage_token).toBeTruthy();
    const roleId = created.role.id;
    await candidates.POST(json("/api/candidates", "POST", { role_id: roleId, skills: [{ skill_id: "sql", level: 1, status: "self-reported" }], consent: true, display_name: "Omar Ali" }));
    expect((await candidates.GET(json(`/api/candidates?role_id=${roleId}`, "GET"))).status).toBe(403);
    expect((await candidates.GET(json(`/api/candidates?role_id=role-frontend-jr`, "GET", undefined, created.manage_token))).status).toBe(403);
    const list = await (await candidates.GET(json(`/api/candidates?role_id=${roleId}`, "GET", undefined, created.manage_token))).json();
    expect(list.candidates).toHaveLength(1);
    expect(list.candidates[0].display_name).toBe("Omar");
    expect(list.candidates[0].counts).toMatchObject({ required: 1, required_recorded: 1 });
    expect(JSON.stringify(list.candidates)).not.toMatch(/readiness|pct|score|rank|token/);
    admin.on = true;
    expect((await candidates.GET(json(`/api/candidates?role_id=${roleId}`, "GET"))).status).toBe(200);
    admin.on = false;
  });
});

describe("review requests", () => {
  const ask = { skill_id: "git", level: 2, evidence: [{ kind: "link", value: "https://github.com/x/y" }] };
  it("need an http(s) link and send only that skill's evidence", async () => {
    expect((await reviews.POST(json("/api/reviews", "POST", { ...ask, evidence: [{ kind: "link", value: "javascript:alert(1)" }] }))).status).toBe(400);
    expect((await reviews.POST(json("/api/reviews", "POST", { ...ask, name: "Lina" }))).status).toBe(400);
  });
  it("only the requester can read or withdraw; only an admin can decide; reviewed needs every rubric line", async () => {
    const d = await (await reviews.POST(json("/api/reviews", "POST", ask))).json();
    expect((await reviews.GET(json(`/api/reviews?id=${d.id}`, "GET"))).status).toBe(404);
    const rubricAllButOne = ["reachable", "own-part", "skill-shown", "level-shown"].map((c, i) => ({ criterion: c, met: i > 0 }));
    const decide = (rubric: unknown) => adminReviews.POST(json("/api/admin/reviews", "POST", { id: d.id, rubric, reason: "Repository is private; please make it public.", reviewer: "Sara" }));
    expect((await decide(rubricAllButOne)).status).toBe(401);
    admin.on = true;
    const out = await (await decide(rubricAllButOne)).json();
    expect(out.decision).toBe("needs-clarification");
    admin.on = false;
    const mine = await (await reviews.GET(json(`/api/reviews?id=${d.id}`, "GET", undefined, d.token))).json();
    expect(mine).toMatchObject({ decision: "needs-clarification", reviewer: "Sara (Bridgecom team, demo)" });
    expect((await reviews.DELETE(json(`/api/reviews?id=${d.id}`, "DELETE", undefined, d.token))).status).toBe(200);
  });
});

describe("comparison endpoint", () => {
  it("accepts only skills and completed courses", async () => {
    const bad = await readiness.POST(json("/api/readiness", "POST", { role_id: "role-frontend-jr", profile: { skills: [], completed_courses: [], tawjihi_avg: 90 } }));
    expect(bad.status).toBe(400);
    const ok = await (await readiness.POST(json("/api/readiness", "POST", { role_id: "role-frontend-jr", profile: { skills: [], completed_courses: [] } }))).json();
    expect(ok.comparison.status).toBe("no-experience-recorded");
  });
  it("says there is not enough information when no requirement can be compared", async () => {
    const d = await (await readiness.POST(json("/api/readiness", "POST", { profile: { skills: [{ skill_id: "sql", level: 2, status: "reviewed" }] }, requirements: [{ skill_id: null, level: 1, importance: "required", label: "SAP" }] }))).json();
    expect(d.comparison.status).toBe("insufficient-requirements");
  });
});

describe("storage failures are reported, never hidden", () => {
  it("a failed write returns 503 and the response does not claim success", async () => {
    const saved = process.env.BRIDGECOM_STORE_PATH;
    process.env.BRIDGECOM_STORE_PATH = dir; // a directory: the atomic rename onto it fails
    const r = await reviews.POST(json("/api/reviews", "POST", { skill_id: "git", level: 2, evidence: [{ kind: "link", value: "https://github.com/x/y" }] }));
    process.env.BRIDGECOM_STORE_PATH = saved;
    expect(r.status).toBe(503);
    expect((await r.json()).token).toBeUndefined();
  });
});
