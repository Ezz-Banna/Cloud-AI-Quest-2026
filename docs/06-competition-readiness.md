# Competition readiness report

Date: 2026-10-09 (evening, Jordan time). Deadline: 2026-10-10 13:00.
Everything under "Observed" was run in the build environment and its output is quoted or saved under `tests/results/`. Everything under "Assumption" or "Not tested" was not measured. Analysis mode for every run below: **keyword rules** (no `ANTHROPIC_API_KEY` in the build environment or on Render).

## 1. Issue register (known failures from the brief)

| # | Failure (reproduced before fixing) | Fix | Evidence |
|---|---|---|---|
| 4.1 | EN posting "Python is not required… No React experience is needed" read Python and React as **mandatory**; "Excel" mapped to **Data analysis**. AR posting: Python missed, React mandatory. | New deterministic reader `src/lib/engines/requirements.ts`: clause-level cues (EN/AR) for required, preferred, not-required; negation wins; alternatives ("or", «أو»); conjunctions; heading sections; duplicates merged; contradictions marked unclear; skills outside the list kept and flagged, never mapped to something broader; instruction-like sentences ignored. New `excel` and `r-lang` skills. AI output (when a key is set) is checked against these rules and disagreements are marked unclear. **Editable review step** before anything is compared. | `tests/job-extraction.test.ts` (20 fixtures, precision 1.000, recall 1.000); blind held-out set (see 2.2); e2e "posting read correctly" |
| 4.2 | Empty profile scored **20%** readiness. | No percentage at all. `compareRole` returns a status (`insufficient-requirements` / `no-experience-recorded` / `compared`), counts of what is recorded, and one next action. | `tests/engines.test.ts` "comparison invariants" |
| 4.3 | Demo profile: fit **100** at **58%** information coverage, looking more certain than complete records. | `FitMeter`: "Match on what we know" and "Information available" shown separately; the bar is filled only for the share of priorities that could be checked, the rest drawn as unknown; under 75% coverage the card says "limited". Ranking already discounts missing data (`rank_score`). | e2e "fit and information coverage shown separately" |
| 4.4 | Only "self-reported / evidence attached / verified"-style states, with no review behind them. | Five states: Self-reported, Evidence attached, Awaiting review, Reviewed against a stated rubric, Needs clarification. Minimal reviewer workflow (see `docs/governance.md`). Old saved states are migrated on load. | `tests/api-access.test.ts`, e2e "reviewer records a rubric decision", "person sees the decision" |
| 4.5 | Keyword analysis labelled as AI in places; no way to tell the mode. | `AnalysisMode` states the mode before submission (from `/api/status`, which exposes only available/model/reason, never the key); result badges say "Read by keyword rules (no AI model)" or "Read by an AI model, checked by rules". Copy that claimed AI was rewritten. | Manual review of all `.tsx` strings containing "AI" |
| 4.6 | Learning path: no cycle check, duplicate courses, big courses for small tasks. | Kahn ordering over prerequisites and task reuse; `findCycles()` tested empty; smallest relevant course preferred (penalties for unneeded skills and long courses), language and level matched; shared courses noted; course length shown next to Bridgecom's task estimate; "Already know this? Show it instead" on every step. | `tests/engines.test.ts` "practice plan" |
| 4.7 | Dashboard said "Succeed — Completed". | Factual labels ("3 skill(s) recorded · 2 with work attached", "Compared with 1 role") and an activity list; nothing implies an outcome. | Dashboard screenshots in e2e run |
| new | **Refetch loop on the compare page**: the comparison and role list re-requested continuously (found during e2e; present before this work). Cause: `tr` changed identity on every state change. | `tr` memoised per language; comparison effect keyed on role id and requirements. | Debug run: 2 comparison requests for one attach instead of an unbounded stream |
| new | `npm audit` (shipped deps): postcss inside Next, 1 high, 1 moderate. | `overrides` pins Next's postcss to 8.5.28. | `npm audit --omit=dev`: 0 vulnerabilities |
| new | Employer endpoint listed every consenting candidate for any role, publicly; candidate id acted as a credential. | Shares are per role with a server-issued id and token; employers need the role's manage token or admin; counts only, no ranking. | `tests/api-access.test.ts` |

## 2. Test matrix

| Area | Test | Result |
|---|---|---|
| Unit and integration | `npm test` (Vitest, 14 files) | **Passed** 118/118 |
| Type check, lint | `npx tsc --noEmit`, `npm run lint` | **Passed** (0 errors) |
| Build | `npm run build` | **Passed** |
| Job reading, builder fixtures | `tests/job-extraction.test.ts`, 20 cases (EN, AR, negation, alternatives, duplicates, contradiction, unsupported, injection) | **Passed**: tp 35, fp 0, fn 0; precision 1.000, recall 1.000. Limitation: written by the builder alongside the reader |
| Job reading, blind held-out | `tests/job-heldout.test.ts`, 20 cases written by a separate agent without access to the reader or v1 fixtures | **Measured, not a gate**: tp 56, fp 1, fn 17; **precision 0.982, recall 0.767**; alternative groups 1/2. 16 of the 17 misses are items marked "unclear" (sent to the person to confirm) rather than wrong. Not tuned against. `tests/results/job-heldout.json` |
| Scoring invariants | empty profile, no requirements, unclear-only, unsupported-only, duplicates, alternatives, not-required excluded, personal fields cannot change result, link ≠ reviewed, monotonic counts | **Passed** |
| Access control | share needs consent + known role; extra personal fields rejected; id alone cannot read/update/withdraw; employer needs manage token; admin-only decisions; requester-only review read/withdraw | **Passed** (`tests/api-access.test.ts`) |
| Data minimisation | comparison endpoint rejects any field beyond skills and completed courses | **Passed** |
| Storage write failure | write to an unwritable path returns 503 and no token | **Passed**; browser storage failure shows a download banner (implemented, **Not tested** automatically) |
| Security (existing) | headers/CSP, rate limits, body caps, admin origin check, session revocation, AI daily cap | **Passed** (unit tests from the security work) |
| End-to-end | `scripts/e2e.mjs`, desktop 1366 and mobile 390, local production build | **Passed** 75/75, no browser console errors |
| Accessibility | `scripts/a11y.mjs`: axe-core WCAG 2.1 A/AA on 9 pages × EN/AR × 390/1366 px, plus overflow and h1 at 640 px (200% zoom approximation) | **Passed** 54/54. A transient contrast flag on the homepage example line during its 1.9 s fade-in disappears once it ends |
| Reduced motion | no running animations on the homepage with `prefers-reduced-motion` | **Passed** |
| Real browser zoom, screen reader | | **Not tested** |
| AI mode against the live API | | **Blocked**: no API key in this environment (only mocked model output is tested) |
| Performance / load | | **Not tested**: no staging environment; the public demo is not load-tested by design |
| Usability with real people | 5-person plan in section 8 | **Pending**: no participants yet |
| Live smoke test | `node scripts/smoke.mjs https://bridgecom.onrender.com` (6 GETs) | See section 5 |

## 3. Category scorecard

Scores are my judgement against the evidence above; a 9 needs evidence, not intent.

| Category | Score | Evidence | What stops it scoring higher |
|---|---|---|---|
| Technical implementation | 8 | 118 tests, 75 e2e, typed APIs, deterministic engines, held-out measurement | File storage on one process; AI path never run live; held-out recall 0.77 |
| Trust and responsible AI | 8 | No percentages; every item quoted; user confirms before comparison; mode shown; evidence states honest | Review is by the team, not independent; no audit of AI outputs in production |
| Security and privacy | 7 | Tokens hashed, per-role consent, minimised payloads, rate limits, CSP, admin sessions | No user accounts; one shared admin password; IP from first `X-Forwarded-For` hop can be spoofed; CSP allows inline scripts |
| UX, accessibility and Arabic | 7 | axe 54/54, EN/AR, 200% approximation, one primary action, editable results | No usability study, no screen-reader run, Arabic copy not reviewed by a native editor |
| Feasibility and scalability | 6 | Runs on a free Node host; Postgres schema drafted | No database, no staging, single instance, sleeps when idle |
| Impact on Jordan | 6 | Real, sourced data for 11 universities, 44 programs, 13 support programs | No users, no pilot, no partners; impact is not yet measured |
| Innovation | 7 | Grounded, reviewable reading of postings and experience in two languages; one next step instead of a score | Components are known techniques; novelty is in the combination |
| Presentation | Not scored | Deck and brochure exist | Deck needs the claims updated to this build (section 9) |

No category is scored 9: each still has a material gap listed in the last column.

## 4. Remaining risks and blocked validations

1. AI mode has never run against the live API. If a key is added before the demo, run one posting and one achievement first; if anything looks wrong, set `BRIDGECOM_OFFLINE=1`.
2. Render free plan: sleeps after 15 idle minutes (first load about a minute) and resets `data/runtime` on restart, so demo shares, roles and reviews disappear. Open the site before presenting.
3. Held-out recall 0.767: about one in four requirements comes back "unclear" and must be confirmed by the person. Safe, but more clicks.
4. Shared admin password and in-memory sessions; any restart signs reviewers out.
5. Dev-only audit findings (vitest chain) remain; they do not ship.
6. No real-user evidence: usability, comprehension of the evidence states and Arabic wording are unvalidated.

## 5. Build and deploy identifier

Filled in at release: see the final handoff message (commit hash on `main`, Render deploy, `/api/health` `build` field, smoke test output).

## 6. Seven-minute demo outline

| Time | Screen | What to show | What to say |
|---|---|---|---|
| 0:00 | Home | Tagline, three goals, the single connecting graphic | Who it is for; one decision at a time |
| 0:40 | Explore an example → program results | Eligibility vs "Match on what we know" vs "Information available" | A record with missing data never looks more certain |
| 1:50 | Empower | Describe a project → skills with exact quotes → keep two → add link → "Evidence attached" | A link is not a review; the states say exactly what is known |
| 3:00 | Empower | Ask for a review → admin rubric decision → back: "Reviewed against a stated rubric" | Who reviews (team, demo), the rubric, how to contest |
| 4:00 | Compare with a role | Paste "Python is not required. SQL is mandatory. Excel is preferred. No React experience is needed." → review step | Negation, specificity, the person confirms |
| 5:00 | Comparison | Counts, each requirement's state, one next step, later steps collapsed, "show it instead" | No percentage; one practical action |
| 6:00 | Employer | Shares need consent and the role's token; counts, not ranking | Privacy by default |
| 6:30 | Close | Live / simulated / planned table | What is real today |

Fallback if the site is asleep or offline: `npm run build && npm start` locally with `BRIDGECOM_OFFLINE=1`; the screenshots in the e2e run cover every step.

## 7. Live, simulated, unavailable and planned capabilities

| Capability | Status |
|---|---|
| Program eligibility, cost, fit and coverage from sourced records | Live |
| Reading postings and experience with keyword rules (EN/AR), quotes checked | Live |
| Reading with an AI model checked by rules | Implemented, **unavailable** on the live site until `ANTHROPIC_API_KEY` is set; never run live |
| Editable requirement review, comparison counts, one next step, practice plan | Live |
| Evidence states and review requests | Live |
| Reviewers | **Simulated**: Bridgecom team members via admin, labelled "(Bridgecom team, demo)" |
| Employers, roles and the demo student "Lina" | **Simulated** (synthetic, labelled) |
| Per-role sharing with consent and revocation | Live (demo store resets on restart) |
| Scholarship matching against published criteria | Live; deadlines not recorded |
| Student accounts, reviewer accounts, partner reviewers, LinkedIn import, employer verification, database | Planned |

## 8. Five-person usability test plan (pending)

Participants: 5 people in Jordan (2 Tawjihi students, 2 recent graduates, 1 career counsellor), recruited with consent; no personal data stored beyond notes.
Tasks (think-aloud, 20 minutes each): 1) find two programs you could apply to and say which has more missing information; 2) describe a project and keep only the skills you agree with; 3) paste the provided posting and correct anything the system got wrong; 4) say in your own words what "Evidence attached" and "Reviewed against a stated rubric" mean; 5) do the next step the comparison suggests.
Measures: task success, errors, time, and whether each participant explains the evidence states correctly (target 4 of 5). Arabic and English sessions both. Status: **pending, no participants yet**. No findings are reported.

## 9. Information or setup still needed

- Optional: `ANTHROPIC_API_KEY` in Render › Environment to enable AI mode. Enter it there yourself; never paste keys into chat.
- `ADMIN_PASSWORD` is generated by Render (Environment tab); needed to show the reviewer step live.
- Deck and brochure claims that mention readiness percentages must use this build's wording (counts and one next step).
