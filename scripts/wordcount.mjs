// Visible word count of each page's <main>, English and Arabic, with the demo profile loaded.
// Counts text a sighted person sees by default: skips hidden elements, collapsed <details> bodies, screen-reader-only
// text and table cells (data tables are content, not explanatory copy). Usage: node scripts/wordcount.mjs [baseUrl] [out.json]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "tests/results/wordcount.json";
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
const PAGES = ["/", "/how", "/discover", "/discover/results", "/compare", "/empower", "/succeed", "/dashboard", "/employer", "/data"];
const res = {};
for (const lang of ["en", "ar"]) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/discover?demo=1`); await page.waitForURL("**/discover/results");
  if (lang === "ar") { await page.getByRole("button", { name: "العربية" }).click(); await page.waitForTimeout(300); }
  for (const path of PAGES) {
    const r = await page.goto(BASE + path); if (!r || r.status() === 404) continue;
    await page.waitForTimeout(1800);
    if (path === "/succeed") { await page.locator("#roles-h ~ ul button").first().click(); await page.waitForTimeout(1500); }
    const n = await page.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      let words = 0;
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const el = t.parentElement;
        if (!el || el.closest("table, script, style, textarea, select, option, svg, [aria-hidden='true'] .sr-only, .sr-only")) continue;
        const d = el.closest("details"); if (d && !d.open && !el.closest("summary")) continue;
        const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) continue;
        words += (t.textContent.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
      }
      return words;
    });
    (res[path] ??= {})[lang] = n;
    console.log(`${lang} ${path}: ${n}`);
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync("tests/results", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
