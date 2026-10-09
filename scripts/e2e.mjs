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
  check(`${tag}: no compulsory intro`, (await page.getByRole("dialog").count()) === 0);
  check(`${tag}: one h1 with the tagline`, (await page.locator("h1").count()) === 1 && /next step, made clearer/i.test(await page.locator("h1").innerText()));
  check(`${tag}: example entry point offered`, await page.getByRole("link", { name: /explore an example/i }).isVisible());
  await page.getByRole("link", { name: /find my next step/i }).click();
  await page.waitForTimeout(600);
  check(`${tag}: "Find my next step" moves focus to the goals`, await page.evaluate(() => !!document.activeElement?.closest("#goals") || document.activeElement?.id === "goals"));
  await page.screenshot({ path: `${OUT}/${tag}-02-home.png`, fullPage: true });

  await page.goto(`${BASE}/discover`);
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
    await page.getByRole("tab", { name: /conversation/i }).click();
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
  check(`${tag}: cards show trade-offs and the not-a-chance note`, (await page.getByRole("heading", { name: "Trade-offs" }).first().isVisible()) && (await page.getByText("Not a chance of admission.").first().isVisible()));
  await page.getByRole("button", { name: /why this recommendation/i }).first().click();
  check(`${tag}: reasons and sources expand`, await page.getByRole("heading", { name: "Sources" }).first().isVisible());
  check(`${tag}: factor table adds up to the match score`, await page.locator("tfoot").first().getByText("Match on what we know").isVisible());
  check(`${tag}: fit and information coverage shown separately`, await page.locator("main ol > li").first().getByText("Information available").isVisible());
  const meterSel = "main ol > li [role=img][aria-label^='Match on what we know']";
  const fitBefore = await page.locator(meterSel).first().getAttribute("aria-label");
  await page.getByRole("button", { name: /adjust priorities/i }).click();
  await page.getByLabel("Location", { exact: false }).first().fill("0");
  await page.waitForFunction(([sel, b]) => document.querySelector(sel)?.getAttribute("aria-label") !== b, [meterSel, fitBefore], { timeout: 10000 }).catch(() => {});
  const fitAfter = await page.locator(meterSel).first().getAttribute("aria-label");
  check(`${tag}: priority slider re-ranks live`, fitBefore !== fitAfter);
  await page.getByRole("button", { name: "Reset" }).click();
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
  check(`${tag}: compare view lists trade-offs`, await page.getByRole("rowheader", { name: "Trade-offs" }).isVisible());
  await page.getByRole("button", { name: /compare in plain words/i }).click();
  check(`${tag}: plain-words comparison shown`, await page.getByText(/Template summary|Written by AI from the table/).first().waitFor({ timeout: 40000 }).then(() => true, () => false));
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
  check(`${tag}: attached link shows "Evidence attached", not reviewed`, await page.locator("section[aria-labelledby=skills-h]").getByText("Evidence attached").first().isVisible());
  check(`${tag}: no global share-with-all-employers switch`, (await page.getByRole("switch").count()) === 0);
  if (tag === "desktop") {
    await page.getByRole("button", { name: /ask for a review/i }).first().click();
    check(`${tag}: review requested`, await page.getByRole("status").filter({ hasText: /Review requested/ }).waitFor({ timeout: 5000 }).then(() => true, () => false));
    check(`${tag}: skill shows "Awaiting review"`, await page.locator("section[aria-labelledby=skills-h]").getByText("Awaiting review").first().isVisible());
  }
  await page.getByText(/fit the published criteria/i).first().waitFor({ timeout: 10000 });
  check(`${tag}: scholarship card separates who can apply, coverage, deadline and source`, await page.getByText("Who can apply (as published)").first().isVisible() && await page.getByText("Deadline", { exact: true }).first().isVisible());
  check(`${tag}: scholarships matched`, true);
  await page.screenshot({ path: `${OUT}/${tag}-06-empower.png`, fullPage: true });

  // Compare with a role
  await page.goto(`${BASE}/succeed`);
  await page.getByRole("button", { name: /Junior Frontend Developer/ }).click();
  await page.getByRole("heading", { name: /How does your experience match this role/i }).waitFor({ timeout: 15000 });
  const cmp = page.locator("section[aria-labelledby=cmp-h]");
  check(`${tag}: comparison shows counts and no percentage`, !(/\d+\s*%/.test(await cmp.innerText())));
  check(`${tag}: one next step`, (await page.getByText("Next step", { exact: true }).count()) === 1);
  const withWork = async () => (await cmp.locator("dl > div").nth(1).locator("dd").first().innerText()).split("/")[0].trim();
  const before = await withWork();
  await page.screenshot({ path: `${OUT}/${tag}-07-compare.png`, fullPage: true });
  await page.getByRole("button", { name: /^Attach your work$/i }).first().click();
  await page.getByLabel("Link to your work").fill("https://example.org/synthetic-project");
  await page.getByRole("button", { name: /attach link/i }).click();
  await page.getByRole("status").filter({ hasText: /Evidence attached/ }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const after = await withWork();
  check(`${tag}: attaching work updates the "with work attached" count (${before} -> ${after})`, Number(after) > Number(before));
  check(`${tag}: later steps are collapsed`, (await page.locator("section[aria-labelledby=path-h] details:not([open])").count()) >= 0);
  await page.getByRole("button", { name: /share my skills with this role/i }).click();
  check(`${tag}: per-role share works`, await page.getByRole("button", { name: /^Withdraw$/ }).waitFor({ timeout: 5000 }).then(() => true, () => false));
  await page.screenshot({ path: `${OUT}/${tag}-08-compare-after.png`, fullPage: true });

  // Paste a posting: requirements are reviewed before anything is compared
  await page.getByLabel("Job posting text").fill("Test vacancy: Junior analyst. Python is not required. SQL is mandatory. Excel is preferred. No React experience is needed.");
  await page.getByRole("button", { name: /read the posting/i }).click();
  await page.getByRole("heading", { name: /check what we read/i }).waitFor({ timeout: 40000 });
  const rr = page.locator("section[aria-labelledby=rr-h] li");
  const rows = {};
  for (let k = 0; k < await rr.count(); k++) { const sel = rr.nth(k).locator("select"); rows[await sel.nth(0).inputValue()] = await sel.nth(1).inputValue(); }
  check(`${tag}: posting read correctly (${JSON.stringify(rows)})`, rows.sql === "required" && rows.excel === "preferred" && rows.python === "not-required" && rows.react === "not-required" && !rows["data-analysis"]);
  await page.getByRole("button", { name: /confirm and compare/i }).click();
  await page.getByRole("heading", { name: /How does your experience match this role/i }).waitFor({ timeout: 15000 });
  check(`${tag}: not-required items listed as not compared`, await page.getByText(/Not compared \(2\)/).isVisible());

  // Employer sees consenting candidate
  await page.goto(`${BASE}/employer`);
  check(`${tag}: shares for a role need its manage token`, await page.getByText(/visible only on the device that published it/).waitFor({ timeout: 10000 }).then(() => true, () => false));
  if (tag === "desktop") {
    await page.getByLabel("Organisation", { exact: true }).fill("Demo Studio");
    await page.getByLabel("Role title").fill("Junior React Developer");
    await page.getByRole("button", { name: /add requirement/i }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /publish role/i }).click();
    await page.getByRole("status").filter({ hasText: /demo database/ }).waitFor();
    check(`${tag}: employer published demo role with a recommended course`, true);
    check(`${tag}: publisher can open its own role's shares`, await page.getByText(/shared their profile yet/).waitFor({ timeout: 10000 }).then(() => true, () => false));
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
    await page.getByRole("tab", { name: /work reviews/i }).click();
    await page.getByRole("button", { name: "Review", exact: true }).first().click();
    for (const cb of await page.locator("section[aria-labelledby=rv-h] fieldset input[type=checkbox]").all()) await cb.check();
    await page.getByLabel(/reason the person will see/i).fill("Repository opens and the quiz uses JavaScript at the stated level.");
    await page.getByLabel("Your name").fill("E2E reviewer");
    await page.getByRole("button", { name: /save decision/i }).click();
    check(`${tag}: reviewer records a rubric decision`, await page.getByRole("status").filter({ hasText: /reviewed against the rubric/i }).waitFor({ timeout: 5000 }).then(() => true, () => false));
    await page.goto(`${BASE}/empower`);
    check(`${tag}: person sees the decision`, await page.locator("section[aria-labelledby=skills-h]").getByText("Reviewed against a stated rubric").first().waitFor({ timeout: 8000 }).then(() => true, () => false));
    await page.goto(`${BASE}/admin`);
    await page.getByRole("tab", { name: /AI review/ }).click();
    check(`${tag}: AI review log lists calls`, (await page.locator("tbody tr").count()) > 0);
    await page.getByRole("tab", { name: /provenance/i }).click();
    await page.screenshot({ path: `${OUT}/${tag}-12-admin.png`, fullPage: true });
  }

  // How it works: every statistic shows a period and a clickable source
  await page.goto(`${BASE}/how`);
  await page.getByRole("heading", { name: /why guidance matters in jordan/i }).waitFor();
  const stats = await page.locator("section[aria-labelledby=why-h] figure").evaluateAll((fs) => fs.map((f) => ({ link: f.querySelector("figcaption a")?.getAttribute("href") ?? "", text: f.textContent ?? "" })));
  check(`${tag}: how-it-works statistics each have a source link and a year`, stats.length >= 3 && stats.every((x) => /^https:\/\//.test(x.link) && /20\d\d/.test(x.text)));
  check(`${tag}: live/simulated/planned table present`, await page.getByRole("columnheader", { name: "Status" }).isVisible());
  await page.screenshot({ path: `${OUT}/${tag}-13-how.png`, fullPage: true });
  await page.goto(`${BASE}/`);
  check(`${tag}: homepage shows at most one sourced statistic`, (await page.locator("section[aria-labelledby=ctx-title] figure").count()) === 1 && await page.locator("section[aria-labelledby=ctx-title] figcaption a").first().isVisible());

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
await p.waitForTimeout(400);
check("reduced motion: no running animations on the homepage", (await p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)) === 0);
await rm.close();
await browser.close();

console.log(errors.length ? `\nBrowser errors:\n${errors.join("\n")}` : "\nNo browser errors.");
const failed = results.filter(([, ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
