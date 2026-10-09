# Bridgecom final audit and competition readiness

> **Superseded.** This audit describes the earlier build that showed readiness percentages. The current build is described in `06-competition-readiness.md`.

Audit date: 2026-10-09 (Jordan time, afternoon). Deadline: 2026-10-10 13:00. Sector 02, Smart Society & Public Services.
Everything marked **Executed** was run in this build environment. Judge reviews (section 7) are **simulated** and labelled as such.

## 1. Actual test results (executed)

| Check | How | Result |
|---|---|---|
| Clean install from the git bundle | `git clone bridgecom.bundle`, `npm ci`, `tsc`, `npm test`, `npm run lint`, `npm run build` | Pass (install 23 s, build ok, 0 lint errors, 1 lint warning) |
| Unit tests | `npm test` (Vitest) | **54/54 pass**: engines, 10 fit-engine scenarios, explanation consistency, real-data grounding, AI guards with mocked model, offline rules, completeness, admin tokens |
| Browser journeys | `node scripts/e2e.mjs` (Playwright, desktop 1366 px and mobile 390 px) | **50/50 pass**, no unexpected console errors |
| Student journey | home → intro skip → 8-step form (validation, progress) → results → sliders re-rank → explanation → save → compare → plain-words comparison | Pass (desktop: form; mobile: chat onboarding) |
| Achievement journey | add achievement → skill suggestions with quotes → accept → portfolio → scholarships → consent | Pass |
| Career journey | employer publishes role with skills and recommended course → student picks role → gap table → pathway → course completion does **not** raise readiness → evidence link raises 13% → 23% | Pass |
| AI failure: invalid API key | server with a fake key; called profile, skills, job, explain, compare | All 5 returned offline results in ≤0.16 s, labelled offline |
| AI failure: network down | server pointed at an unreachable AI host | All 5 returned offline results in ≤0.03 s |
| API failure in the browser | matching API forced to 500; all APIs aborted | Results page shows an error; dashboard, compare and Succeed now show an error (fixed, see 3) |
| Accessibility (axe-core, WCAG 2 A/AA) | 10 pages × EN/AR | Before: only colour-contrast rule failed (up to 50 nodes per page). After fixes: **0 violations** on all 20 page/language combinations (re-run) |
| Mobile overflow | 10 pages × EN/AR at 375 px | Dashboard overflowed by 187 px; fixed, now 0 pages overflow |
| Arabic text audit | scan for English text in Arabic mode | Interface labels, cities, missing-data labels, stream, kinds and university names fixed. Remaining English is data (see 4) |
| Internal links | header and footer links | All return 200 |
| Live AI with a real key | — | **Not run**: no API key provided. The AI service is reachable from this environment (an invalid key got a real 401). |

## 2. Feature inventory

**Working (tested above):** intro animation with skip and reduced motion; three-stage journey indicator; EN/AR with RTL; 8-step onboarding form and chat onboarding with review; rule-based eligibility (eligible / ineligible / unknown) with source and year; personal fit score with student sliders, coverage, strengths, trade-offs, alternatives and follow-up questions; cost from sourced fees with fee year and check date; missing-data flags; save and compare (up to 4) with plain-language comparison; achievements with quoted skill suggestions; portfolio and evidence; scholarship matching with verification badges and an application-pack draft; opt-in sharing; employer portal (demo organisations labelled, skills, levels, importance, recommended courses, posting parsing); gap analysis with learning priority; prerequisite-ordered pathway with practical projects and progress; dashboard; About the data page with coverage and completeness; password-protected admin (import with validation, record edit and revert, provenance and conflicts review, study-plan reader, AI log).

**Working offline only, AI path not live-tested:** AI profile reading, skill suggestions, posting parsing, explanation, comparison, study-plan reading. Each has guards (quotes, numbers, ids) tested with mocked model output, and an offline fallback tested end to end.

**Incomplete or not built:** student accounts and server-side profiles (profile is on the device); file uploads; LinkedIn import; verified employers; accreditation status, other mandatory fees and past competitive cut-offs (not collected); national coverage (11 universities, 44 programs); public deployment; pitch deck.

## 3. Defects found and fixed in this audit

| # | Defect | Fix |
|---|---|---|
| 1 | Low contrast on small labels, badges and status text (axe: up to 50 nodes per page) | Darkened text tokens: sage-600 #467068, ok #256b4d, warn #84592f; logo wordmark uses sage-600 |
| 2 | Mobile dashboard 187 px wider than the screen | Grid columns use `minmax(0, 1fr)` |
| 3 | Network failure was silent on dashboard, compare, Succeed and employer pages (looked like "no data") | Each now shows a clear error message |
| 4 | Raw AI provider error bodies were sent to the browser | Errors reduced to short categories (key rejected, unreachable, timed out, rate limited) |
| 5 | English leaking into Arabic mode: city names, missing-data chips, stream, opportunity kinds, dataset names, home diagram labels; 5 universities without Arabic names; program names | All translated; Arabic university names added (noted as not source-checked); programs without an Arabic name show the Arabic field name with the official English name underneath |
| 6 | Offline comparison text read awkwardly ("strongest on Matches your…") | Reworded template |
| 7 | (earlier today) uncertain students were forced to pick a field | "I'm not sure yet" option; follow-up questions appear only when they change results |

## 4. Remaining limitations

- Live AI never run with a real key. Until it is, demo in offline mode or test the key tonight.
- Profile lives in the browser (no accounts). Employer roles, consented snapshots and admin edits live in JSON files on the server, so it needs a Node host with a writable disk, not serverless.
- Admin is one shared password.
- Data: 11 universities, 44 programs, 13 support programs, 45 courses; 6 study plans read; no accreditation, extra fees or historical cut-offs; UJ has no programs (fee pages blocked), Mutah, GJU and HTU have none.
- In Arabic mode, data text (scholarship descriptions, role titles, course titles, most program names) stays in its source language.
- Employers, roles and the demo student "Lina" are synthetic and labelled.
- `/api/status` reports "AI on" whenever a key is set, even if the key is wrong; each result carries its true mode badge.
- Worst-case AI wait if the network hangs (not refuses): 2 × 20 s. Use `BRIDGECOM_OFFLINE=1` if the venue network is unreliable.

## 5. Deployment and setup status

- Source: git repository with full history, bundle at `/mnt/project-files/bridgecom/bridgecom.bundle`. **Not pushed to GitHub yet** (repository not chosen).
- Not deployed publicly. Runs locally with:
  ```bash
  npm ci && npm run build
  ADMIN_PASSWORD=<choose> ANTHROPIC_API_KEY=<key or empty> npm start   # http://localhost:3000
  ```
- Reset demo data: delete `data/runtime/*.json`. Offline demo: `BRIDGECOM_OFFLINE=1`.

## 6. Submission checklist

| Item | Status | Action |
|---|---|---|
| Functional application | Ready (local) | Rehearse on the demo laptop |
| Runnable source repository | Code ready, **not on GitHub** | Name the repo; push; check the README renders |
| Accurate technical README | Ready (updated with this audit) | — |
| Pitch deck | **Missing** | Build tonight (structure in section 8) |
| Reliable live demo | Ready offline; AI path untested live | Test the key tonight; keep offline backup |
| Disclosure of synthetic and mocked parts | In UI and README | Say it in the pitch |
| Sector framing | Sector 02 confirmed | Use on the title slide |

## 7. Competition review (SIMULATED judges)

> The three reviews below are simulated by the assistant to stress-test the pitch. They are not real judge feedback.

**Domain judge (education in Jordan), simulated.** Likes that minimum-to-apply is separated from competitive cut-offs and that cost comes from fee PDFs. Will ask: "Why should a student trust this over the Unified Admission site and a school counsellor?" and "Your data covers 44 programs; Jordan has hundreds." Wants a counsellor or ministry use case.

**AI/technical judge, simulated.** Likes the engine-decides, LLM-words split, quote and number guards, conflict handling, and 54 + 50 automated checks. Will ask: "Show me the AI working live", "What happens when the model is wrong?", "Why not just ask the LLM for recommendations?" A demo that is offline only weakens the Technical Implementation score.

**Business judge, simulated.** Likes the three-stage funnel and the employer side. Will ask: "Who pays?", "How do you get employers and universities to keep data current?", "What does it cost to run per student?" (about $0.10 of AI per full journey at list prices, per docs/03).

**Three most damaging weaknesses and immediate fixes**
1. **AI never shown live.** Fix: get a key tonight, run the three AI steps on the demo laptop, record a 60-second screen capture as backup.
2. **No pitch deck and no public repo.** Fix: build the deck from section 8; push the repo and paste its URL into the deck and submission.
3. **Data breadth looks thin.** Fix: frame it as "11 universities, 44 programs, every number sourced and dated; the import and audit pipeline is how it scales", show the About the data page and the admin study-plan reader for 15 seconds; name the next data sources (Unified Admission Unit, HEAC).

## 8. Seven-minute pitch structure

| Time | Segment | Content |
|---|---|---|
| 0:00-0:45 | Problem | Three transitions every Jordanian student faces, with scattered fee PDFs, minimums confused with cut-offs, skills without proof, employers filtering on grades |
| 0:45-1:15 | Solution | One profile, three stages (Discover, Empower, Succeed). The AI reads and explains; rules decide eligibility, cost and readiness |
| 1:15-4:45 | Live demo (script below) | Student journey, achievement, career gap |
| 4:45-5:30 | Trust and technology | Sourced records with dates, guards on every AI output, conflicts excluded, 54 unit + 50 browser tests, offline fallback |
| 5:30-6:15 | Impact and scale | Sector 02 public value: fairer guidance outside Amman, cost transparency for families, skill evidence for employers; pipeline to national coverage; ministry dashboards later |
| 6:15-7:00 | Ask and close | Pilot with schools and one university; data partnership with the Unified Admission Unit; "From where you are to where you could be" |

**Demo script (3.5 minutes):**
1. Home: intro plays, press Skip (5 s).
2. Discover: "Use the synthetic demo student" (say it is synthetic) → results. Point at JUST CS: eligibility vs published minimum 65 (2024) "minimum to apply, not a cut-off"; cost ~1,089 JOD/yr with fee year and check date; why it fits and trade-offs (40 s).
3. Open "What matters most?" → drag Location to 5 and Cost to 0 → ranking and scores change (15 s). Open "Why this recommendation?" → factor table adds up to the fit; "left out" for missing study plan (20 s).
4. Save two programs → Compare → "Compare in plain words" (20 s).
5. Empower: add "I built my personal website with HTML and CSS and JavaScript" with a link → skill suggestions with quotes → accept (40 s).
6. Succeed: pick Junior Frontend Developer → readiness 13% → mark a course complete (no change: "a course is not proof") → add the project link → 23% (45 s).
7. Switch to Arabic for 10 s on the results page.

**Backup if the AI or network fails:** the app keeps working; each AI result shows "Offline keyword rules". Before the pitch, start the server with `BRIDGECOM_OFFLINE=1` if the venue network is uncertain. If the laptop fails: use the screenshots in `/mnt/project-files/bridgecom/screenshots/` in the deck, labelled "recorded from the working build".

## 9. Three-minute Q&A preparation

| Likely question | Answer |
|---|---|
| Is the AI deciding admission? | No. Eligibility, cost, scholarships and readiness are rules over sourced records. The AI turns free text into structured data and writes explanations; every number it writes must exist in the facts or we show a template. |
| What if the data is wrong or outdated? | Every record has a source and check date; admin flags records older than 180 days and conflicting sources, and disputed facts are left out of scoring. |
| How many universities? | 11 universities, 44 programs in 8 fields so far, chosen for depth over breadth; the import and audit pipeline is built for national coverage. |
| Personal data? | The profile stays on the student's device; sharing with employers is opt-in, revocable, and excludes grades, city, budget and accessibility needs; aligned with Jordan's Personal Data Protection Law No. 24 of 2023 (legal review still needed). |
| Are the employers real? | No, they are synthetic and labelled; the employer portal marks demo organisations. |
| Business model? | Free for students; paid for employers posting skills-based roles and for universities and ministries using anonymised demand dashboards; AI cost about $0.10 per full student journey. |
| Why not ChatGPT? | A general chatbot invents fees and cut-offs; Bridgecom grounds every fact in a dated source and tests that. |
| Arabic? | Full Arabic interface with RTL; some source data is English-only and shown as published. |

## 10. Recommended improvements, ordered by urgency

1. Tonight: provide an API key and run the three AI journeys live; fix anything found.
2. Tonight: build the pitch deck; name the GitHub repo and push.
3. Tonight: rehearse the demo twice on the presenting laptop, once with `BRIDGECOM_OFFLINE=1`.
4. Morning: collect past competitive cut-offs for the demo programs from the Unified Admission Unit (by hand) and load them through admin.
5. Morning: add Arabic program names for the programs shown in the demo.
6. Later: accounts, file evidence, verified employers, national data coverage.
