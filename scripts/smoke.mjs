// Read-only smoke test for a deployed site: a handful of GET requests, one at a time, no writes.
// Safe for the public demo. Usage: node scripts/smoke.mjs https://bridgecom.onrender.com
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const checks = [
  ["/api/health", async (r) => r.ok && (await r.json()).ok === true],
  ["/", async (r) => r.ok && /next step, made clearer/i.test(await r.text())],
  ["/succeed", async (r) => r.ok],
  ["/empower", async (r) => r.ok],
  ["/api/roles", async (r) => r.ok && Array.isArray((await r.json()).roles)],
  ["/api/candidates?role_id=role-frontend-jr", async (r) => r.status === 403],
];
let failed = 0;
for (const [p, ok] of checks) {
  const t = Date.now();
  let pass = false;
  let status = 0;
  try { const r = await fetch(BASE + p, { headers: { "user-agent": "bridgecom-smoke" } }); status = r.status; pass = await ok(r); } catch (e) { status = String(e.message); }
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  GET ${p}  ${status}  ${Date.now() - t}ms`);
}
process.exit(failed ? 1 : 0);
