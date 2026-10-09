// End-to-end walk through the demo journey in a real browser. Usage: node scripts/e2e.mjs [baseUrl] [screenshotDir]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "e2e-screens";
fs.mkdirSync(OUT, { recursive: true });
const exe = fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); };
const errors = [];

async function run(viewport, tag) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });

  await page.goto(BASE);
  const intro = page.getByRole("dialog", { name: /introduction/i });
  check(`${tag}: intro animation shows`, await intro.waitFor({ timeout: 3000 }).then(() => true, () => false));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${tag}-01-intro.png` });
  await page.getByRole("button", { name: /skip intro/i }).click();
  check(`${tag}: intro is skippable`, !(await intro.isVisible()));
  await page.screenshot({ path: `${OUT}/${tag}-02-home.png`, fullPage: true });

  // Discover conversation
  await page.getByRole("link", { name: /start my journey/i }).click();
  await page.waitForURL("**/discover");
  const answers = ["Lina", "86.4 scientific stream", "I love coding and making websites, maybe AI too", "Build apps that help people in Jordan as a web developer", "About 2500 JOD, I need a scholarship", "Irbid, Amman is fine too", "No preference", "Nothing specific"];
  for (const a of answers) {
    await page.getByLabel("Your answer").fill(a);
    await page.getByRole("button", { name: "Send" }).click();
  }
  await page.getByRole("heading", { name: /what I understood/i }).waitFor({ timeout: 40000 });
  check(`${tag}: profile draft shown`, true);
  check(`${tag}: average extracted`, (await page.getByLabel(/average/i).inputValue()) === "86.4");
  await page.screenshot({ path: `${OUT}/${tag}-03-review.png`, fullPage: true });
  await page.getByRole("button", { name: /save and see/i }).click();
  await page.waitForURL("**/discover/results");
  await page.getByRole("button", { name: /why this recommendation/i }).first().waitFor({ timeout: 15000 });
  const cards = await page.locator("main ol > li").count();
  check(`${tag}: program matches listed (${cards})`, cards > 0);
  await page.getByRole("button", { name: /why this recommendation/i }).first().click();
  check(`${tag}: reasons and sources expand`, await page.getByRole("heading", { name: "Sources" }).first().isVisible());
  await page.screenshot({ path: `${OUT}/${tag}-04-results.png`, fullPage: true });

  // Empower
  await page.goto(`${BASE}/empower`);
  await page.getByLabel("Title").fill("Personal portfolio website");
  await page.getByLabel(/what did you actually do/i).fill("I built my personal website with HTML and CSS and made it responsive for phones. I added a quiz game using JavaScript and published the code on GitHub.");
  await page.getByLabel(/evidence link/i).fill("https://example.org/synthetic-portfolio");
  await page.getByRole("button", { name: /suggest skills/i }).click();
  await page.getByRole("button", { name: /save with my description/i }).waitFor({ timeout: 40000 });
  const proposed = await page.locator("blockquote").count();
  check(`${tag}: skills proposed with quotes (${proposed})`, proposed >= 2);
  await page.screenshot({ path: `${OUT}/${tag}-05-skills-proposed.png`, fullPage: true });
  await page.getByRole("button", { name: /save with my description/i }).click();
  check(`${tag}: skills saved to profile`, (await page.locator("#skills-h + span, section[aria-labelledby=skills-h] li").count()) >= 2);
  await page.getByRole("switch").check();
  await page.getByRole("status").filter({ hasText: /Shared/ }).waitFor();
  check(`${tag}: consent sharing works`, true);
  await page.getByText(/likely relevant/i).first().waitFor({ timeout: 10000 });
  check(`${tag}: scholarships matched`, true);
  await page.screenshot({ path: `${OUT}/${tag}-06-empower.png`, fullPage: true });

  // Succeed
  await page.goto(`${BASE}/succeed`);
  await page.getByRole("button", { name: /Junior Frontend Developer/ }).click();
  await page.getByRole("heading", { name: /your learning pathway/i }).waitFor({ timeout: 15000 });
  const ring = page.getByRole("img", { name: /Readiness/ });
  const before = await ring.getAttribute("aria-label");
  await page.screenshot({ path: `${OUT}/${tag}-07-readiness.png`, fullPage: true });
  await page.getByRole("button", { name: /mark course complete/i }).first().click();
  await page.waitForTimeout(800);
  const afterCourse = await ring.getAttribute("aria-label");
  check(`${tag}: completing a course alone does not raise readiness (${before} -> ${afterCourse})`, before === afterCourse);
  await page.getByRole("button", { name: /I've done this, add my link/i }).first().click();
  await page.getByLabel("Link to your work").fill("https://example.org/synthetic-project");
  await page.getByRole("button", { name: /add evidence/i }).click();
  await page.waitForTimeout(1200);
  const after = await ring.getAttribute("aria-label");
  check(`${tag}: evidence raises readiness (${before} -> ${after})`, parseInt(after.match(/\d+/)[0]) > parseInt(before.match(/\d+/)[0]));
  await page.screenshot({ path: `${OUT}/${tag}-08-readiness-after.png`, fullPage: true });

  // Employer sees consenting candidate
  await page.goto(`${BASE}/employer`);
  await page.getByText("Lina").first().waitFor({ timeout: 10000 });
  check(`${tag}: employer sees consenting candidate`, true);
  await page.screenshot({ path: `${OUT}/${tag}-09-employer.png`, fullPage: true });

  // Data page + Arabic
  await page.goto(`${BASE}/data`);
  await page.getByRole("heading", { name: "Programs" }).waitFor();
  await page.screenshot({ path: `${OUT}/${tag}-10-data.png`, fullPage: true });
  await page.getByRole("button", { name: "العربية" }).click();
  await page.waitForTimeout(300);
  check(`${tag}: Arabic switches to RTL`, (await page.evaluate(() => document.documentElement.dir)) === "rtl");
  await page.goto(`${BASE}/succeed`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-11-arabic-succeed.png`, fullPage: true });
  await ctx.close();
}

await run({ width: 1366, height: 860 }, "desktop");
await run({ width: 390, height: 844 }, "mobile");

// reduced motion
const rm = await browser.newContext({ reducedMotion: "reduce" });
const p = await rm.newPage();
await p.goto(BASE);
check("reduced motion: still logo, no moving scene", (await p.locator(".bc-traveller").count()) === 0);
await rm.close();
await browser.close();

console.log(errors.length ? `\nBrowser errors:\n${errors.join("\n")}` : "\nNo browser errors.");
const failed = results.filter(([, ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
