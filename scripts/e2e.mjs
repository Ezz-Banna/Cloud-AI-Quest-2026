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
  // 401s are expected while testing the admin sign-in, so they are not counted as errors
  page.on("console", (m) => { if (m.type() === "error" && !/status of 401/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });

  await page.goto(BASE);
  const intro = page.getByRole("dialog", { name: /introduction/i });
  check(`${tag}: intro animation shows`, await intro.waitFor({ timeout: 3000 }).then(() => true, () => false));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${tag}-01-intro.png` });
  await page.getByRole("button", { name: /skip intro/i }).click();
  check(`${tag}: intro is skippable`, !(await intro.isVisible()));
  await page.screenshot({ path: `${OUT}/${tag}-02-home.png`, fullPage: true });

  await page.getByRole("link", { name: /start my journey/i }).click();
  await page.waitForURL("**/discover");
  if (tag === "desktop") {
    // Step-by-step form
    const cont = () => page.getByRole("button", { name: /^(Continue|See my matches)$/ }).click();
    await cont();
    check(`${tag}: form validation blocks an empty step`, await page.getByRole("alert").filter({ hasText: /education level/i }).isVisible());
    await page.getByLabel(/what should we call you/i).fill("Lina");
    await page.getByRole("button", { name: /Finished Tawjihi/ }).click(); await cont();
    await page.getByRole("button", { name: "Scientific" }).click(); await page.getByLabel("Average (%)").fill("86.4"); await cont();
    await page.getByRole("button", { name: "Computing / IT" }).click(); await page.getByRole("button", { name: "Computer Science", exact: true }).click(); await page.getByRole("button", { name: "Software Engineering" }).click(); await cont();
    await page.getByRole("button", { name: "Problem solving" }).click(); await cont();
    await page.getByLabel(/dream careers/i).fill("web developer"); await page.getByRole("button", { name: "Technology" }).click(); await cont();
    await page.getByRole("button", { name: "2,500" }).click(); await page.getByRole("button", { name: "Yes" }).click(); await cont();
    await page.getByRole("button", { name: "Irbid" }).click(); await page.getByRole("button", { name: "Low cost" }).click(); await page.getByRole("button", { name: /Leads to my dream career/ }).click(); await cont();
    check(`${tag}: progress indicator reaches 100%`, (await page.getByRole("progressbar").getAttribute("aria-valuenow")) === "100");
    await page.screenshot({ path: `${OUT}/${tag}-03-form.png`, fullPage: true });
    await cont();
  } else {
    // AI conversational mode
    await page.getByRole("tab", { name: /chat with ai/i }).click();
    const answers = ["Lina", "86.4 scientific stream", "I love coding and making websites, maybe AI too", "Build apps that help people in Jordan as a web developer", "About 2500 JOD, I need a scholarship", "Irbid, Amman is fine too", "No preference", "Nothing specific"];
    for (const a of answers) {
      await page.getByLabel("Your answer").fill(a);
      await page.getByRole("button", { name: "Send" }).click();
    }
    await page.getByRole("heading", { name: /what I understood/i }).waitFor({ timeout: 40000 });
    check(`${tag}: chat profile draft shown`, true);
    check(`${tag}: average extracted`, (await page.getByLabel(/average/i).inputValue()) === "86.4");
    await page.screenshot({ path: `${OUT}/${tag}-03-review.png`, fullPage: true });
    await page.getByRole("button", { name: /save and see/i }).click();
  }
  await page.waitForURL("**/discover/results");
  await page.getByRole("button", { name: /why this recommendation/i }).first().waitFor({ timeout: 15000 });
  const cards = await page.locator("main ol > li").count();
  check(`${tag}: program matches listed (${cards})`, cards > 0);
  await page.getByRole("button", { name: /why this recommendation/i }).first().click();
  check(`${tag}: reasons and sources expand`, await page.getByRole("heading", { name: "Sources" }).first().isVisible());
  await page.getByRole("button", { name: /explain in plain words/i }).first().click();
  await page.getByText(/Template explanation|Written by AI/).first().waitFor({ timeout: 40000 });
  check(`${tag}: plain-words explanation shown`, true);
  await page.screenshot({ path: `${OUT}/${tag}-04-results.png`, fullPage: true });
  const saves = page.getByRole("button", { name: /☆ Save/ });
  await saves.nth(0).click(); await saves.nth(0).click();
  await page.getByRole("link", { name: /Compare saved \(2\)/ }).click();
  await page.waitForURL("**/compare");
  await page.getByRole("table").waitFor({ timeout: 15000 });
  check(`${tag}: compare view shows 2 programs`, (await page.locator("thead th").count()) === 2);
  await page.screenshot({ path: `${OUT}/${tag}-04b-compare.png`, fullPage: true });

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
  if (tag === "desktop") {
    await page.getByLabel("Organisation", { exact: true }).fill("Demo Studio");
    await page.getByLabel("Role title").fill("Junior React Developer");
    await page.getByRole("button", { name: /add requirement/i }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /publish role/i }).click();
    await page.getByRole("status").filter({ hasText: /demo database/ }).waitFor();
    check(`${tag}: employer published demo role with a recommended course`, true);
  }
  await page.screenshot({ path: `${OUT}/${tag}-09-employer.png`, fullPage: true });

  await page.goto(`${BASE}/dashboard`);
  await page.getByRole("heading", { name: /profile completeness/i }).waitFor();
  const comp = Number(await page.getByRole("progressbar").getAttribute("aria-valuenow"));
  check(`${tag}: dashboard shows completeness (${comp}%)`, comp > 50);
  await page.screenshot({ path: `${OUT}/${tag}-09b-dashboard.png`, fullPage: true });

  if (tag === "desktop") {
    const blocked = await page.request.post(`${BASE}/api/data/import`, { data: { dataset: "courses", rows: [] } });
    check(`${tag}: import API refuses without admin sign-in (${blocked.status()})`, blocked.status() === 401);
    await page.goto(`${BASE}/admin`);
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    check(`${tag}: admin rejects a wrong password`, await page.getByRole("alert").filter({ hasText: /wrong password/i }).waitFor({ timeout: 5000 }).then(() => true, () => false));
    await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD || "test-admin");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: /data and quality/i }).waitFor();
    await page.getByRole("tab", { name: /edit records/i }).click();
    await page.getByRole("button", { name: /^Computer Science/ }).first().click();
    const ta = page.getByLabel(/Record \(JSON/);
    const rec = JSON.parse(await ta.inputValue());
    rec.notes = "Edited in e2e test";
    await ta.fill(JSON.stringify(rec));
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("status").filter({ hasText: /Saved/ }).waitFor();
    check(`${tag}: admin edits a program record`, true);
    await page.getByRole("button", { name: /revert my edit/i }).click();
    await page.getByRole("tab", { name: /AI review/ }).click();
    check(`${tag}: AI review log lists calls`, (await page.locator("tbody tr").count()) > 0);
    await page.getByRole("tab", { name: /provenance/i }).click();
    await page.screenshot({ path: `${OUT}/${tag}-12-admin.png`, fullPage: true });
  }

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
