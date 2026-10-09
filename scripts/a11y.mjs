// Accessibility and layout checks: axe-core (WCAG 2.1 A/AA rules) plus horizontal overflow at phone width and at
// a 640px viewport (what a 1280px window shows at 200% zoom). Usage: node scripts/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.argv[2] || "http://localhost:3000";
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
const PAGES = ["/", "/how", "/discover", "/discover/results", "/compare", "/empower", "/succeed", "/dashboard", "/employer", "/data"];
const out = [];
for (const lang of ["en", "ar"]) for (const vp of [{ width: 390, height: 844 }, { width: 640, height: 400 }, { width: 1366, height: 860 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/discover?demo=1`); await page.waitForURL("**/discover/results");
  if (lang === "ar") { await page.getByRole("button", { name: "العربية" }).click(); await page.waitForTimeout(300); }
  for (const path of PAGES) {
    await page.goto(BASE + path); await page.waitForTimeout(2600); // after the homepage motion has finished
    if (path === "/succeed") { await page.locator("#roles-h ~ ul button").first().click(); await page.waitForTimeout(1500); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const h1 = await page.locator("h1").count();
    let violations = [];
    if (vp.width === 1366 || vp.width === 390) {
      await page.addScriptTag({ content: axeSource });
      violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })));
    }
    out.push({ lang, width: vp.width, path, overflow, h1, violations });
    console.log(`${lang} ${vp.width} ${path}: overflow=${overflow} h1=${h1} axe=${violations.map((v) => `${v.id}(${v.impact},${v.n})`).join(" ") || "none"}`);
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync("tests/results", { recursive: true });
fs.writeFileSync("tests/results/a11y.json", JSON.stringify(out, null, 2));
const bad = out.filter((r) => r.overflow > 0 || r.h1 !== 1 || r.violations.length);
console.log(`\n${out.length - bad.length}/${out.length} page checks clean`);
