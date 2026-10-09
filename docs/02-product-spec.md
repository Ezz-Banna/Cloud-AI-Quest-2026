# Bridgecom product specification

Covers: product requirements, user journeys, features and priorities, information architecture, design system, testing and validation plan, hackathon MVP scope and roadmap. Architecture is in `01-architecture-and-priorities.md`, AI modules in `03-ai-modules.md`, database in `../db/schema.sql`.

## 1. Product requirements

**Problem.** Jordanian students move through three transitions with little connected guidance: choosing a university program after Tawjihi, showing abilities that exam scores miss, and becoming employable. Information is scattered across university fee PDFs, admission portals, fund websites and job boards, and the advice that exists rarely explains itself.

**Users.**
- Tawjihi graduates (17-19) and their families: need to know which programs they can apply to, what they cost and why they fit.
- University students and recent graduates: need to present skills beyond grades and find funding and work.
- Employers (SMEs, startups, NGOs): need to describe skills, not degrees, and reach prepared candidates.
- Counsellors and public bodies (future): need aggregate insight on gaps between learning and work.

**Goals for the MVP.**
1. A student gets an explained, sourced shortlist of programs in under five minutes.
2. A student turns one achievement into evidenced skills without anything being invented.
3. A student sees an honest readiness score for a real-shaped role and a sequenced plan to close the gap, and sees the score rise when they add evidence.
4. An employer publishes a role as skills and sees only consenting candidates.

**Non-goals.** Admission decisions, funding decisions, hiring decisions, certification.

**Functional requirements (Must).**
| ID | Requirement | Status |
|---|---|---|
| RQ-01 | Conversational onboarding in English or Arabic, with chips and free text | Built |
| RQ-02 | AI turns answers into a structured profile; student confirms and edits | Built (AI path needs an API key; offline rules tested) |
| RQ-03 | Rule-based check against the published minimum average, with year and source | Built |
| RQ-04 | Program fit score with per-factor reasons, cost estimate from sourced fees | Built |
| RQ-05 | Achievements with evidence links; AI skill suggestions with exact quotes; accept or reject | Built |
| RQ-06 | Scholarship matching with reasons and verification badges; application pack draft | Built |
| RQ-07 | Employer role with mandatory and preferred skills and levels; paste-a-posting parsing | Built |
| RQ-08 | Gap analysis, prerequisite-ordered pathway, practical task per skill, course tracking | Built |
| RQ-09 | Re-evaluation when evidence is added; readiness history | Built |
| RQ-10 | Opt-in sharing; employer sees consenting candidates with job-related data only | Built |
| RQ-11 | Verified, partial, synthetic and self-reported labels everywhere | Built |
| RQ-12 | Intro animation (skippable, reduced motion) and three-stage journey indicator | Built |
| RQ-13 | Arabic UI with RTL | Built for all core screens |
| RQ-14 | Sample-data import with validation report (admin only) | Built |
| RQ-15 | Step-by-step onboarding form: 8 steps, progress bar, per-step validation, review | Built |
| RQ-16 | Save programs and compare them side by side | Built |
| RQ-17 | Student dashboard: completeness, matches, saved, skills, opportunities, journey | Built |
| RQ-18 | Plain-language explanation of computed reasons (AI wording, numbers checked against facts, template fallback) | Built (AI path needs an API key) |
| RQ-19 | Employer portal: demo organisation, importance per skill, recommended courses (boosted in the pathway) | Built |
| RQ-20 | Gap table with evidence and learning priority; pathway steps with objective, prerequisites, duration, outcome | Built |
| RQ-22 | Personal fit engine: student-weighted criteria, live re-ranking, coverage, trade-offs, alternatives, follow-ups, conflict handling (`04-fit-engine.md`) | Built |
| RQ-21 | Protected admin: import, record edits and revert, provenance review, demo role clean-up, AI error log | Built (single shared password) |

## 2. User journeys

**Lina, Tawjihi graduate (synthetic persona).** Scientific stream, 86.4, from Irbid, likes making websites, family can spend about 2,500 JOD a year and needs support.
1. Opens Bridgecom, watches or skips the intro.
2. Discover: answers eight questions in a chat. Reviews "Here's what I understood", fixes the budget.
3. Sees programs ranked by fit, each with an admission check against the published minimum, tuition per year and "Why this recommendation?" with sources. Learns that the minimum to apply is not the competitive cut-off.
4. Empower: adds her portfolio site. AI proposes HTML, CSS and JavaScript with the exact sentences that show them. She keeps them; the link makes them "evidence attached".
5. Sees the MoHE Student Support Fund as likely relevant (need-based, minimum 65, Jordanian), opens the official page, prepares an application pack draft.
6. Turns on sharing with employers.
7. Succeed: picks "Junior Frontend Developer". Readiness is low; React, REST APIs and Git are missing; JavaScript is below level. The pathway starts with prerequisites and pairs each course with a project.
8. Marks a course complete (readiness does not change), builds the project, adds the link, readiness rises.

**Employer (synthetic Nashmi Digital).** Pastes a posting, reviews the extracted skills, publishes, sees Lina's first name, readiness and skill statuses, nothing else.

**Pain points addressed.** Fees hidden in PDFs; minimum averages confused with cut-offs; skills without proof; generic course lists without order; employers filtering on grades.

## 3. Feature list and priorities

| Priority | Feature |
|---|---|
| Must (done) | RQ-01 to RQ-12 |
| Should (done) | RQ-13 Arabic/RTL, RQ-14 import, employer publishing, mobile layout |
| Should (next) | Live AI evaluation run with a key; Arabic names for all programs; competitive cut-offs from the unified admission unit; UJ, Mutah, GJU, HTU program records |
| Could | Accounts (Supabase auth), per-user admin roles, evidence file upload, counsellor dashboard |
| Later | LinkedIn import through LinkedIn's official partner API, verified credentials (Open Badges), employer verification, practical assessments reviewed by mentors, national coverage with scheduled re-checks |
| Won't (MVP) | Real funding flows, automated admission or hiring decisions, scraping |

## 4. Information architecture

```
/                       Home: intro animation, value, three stages, trust principles
/discover               Stage 1: step-by-step form (default) or chat with AI → profile review
/discover/results       Ranked programs: admission check · fit · cost · reasons · sources · missing data · save · explain
/compare                Saved programs side by side
/dashboard              Completeness · top matches · saved · skills · opportunities · journey progress
/empower                Stage 2: add achievement → AI skill suggestions · My skills · evidence links
                        Scholarships worth checking · application pack · share with employers
/succeed                Stage 3: open roles · paste a posting · readiness · gap table · pathway
/employer               Publish a role (manual or from posting) · consenting candidates per role
/data                   Coverage counts · what is real vs synthetic · program table with sources
/admin                  Password-protected: import · edit/revert records · provenance issues · demo roles · AI log
/api/*                  status, ai/profile, ai/skills, ai/job, ai/explain, match/programs, match/opportunities,
                        roles, readiness, candidates, data/coverage, data/import, admin/login, admin/logout,
                        admin/overview, admin/record, admin/roles
```
Global: header (logo, My dashboard, employers, data, language toggle), journey indicator on stage pages, footer with disclaimers, Admin and "Replay intro".

## 5. Design system

- **Tokens** (`src/app/globals.css`): deep teal #264653 (primary, text headings), sage #6F9C94 (progress, accents), soft mist #E8EFEA (surfaces), warm ivory #F8F7F3 (page), sand #D2A679 (focus ring, highlights, current-stage marker); semantic ok/warn/bad pairs; radius 1.25 rem cards, full-round buttons and chips.
- **Type:** Plus Jakarta Sans (Latin), IBM Plex Sans Arabic (Arabic), loaded with next/font.
- **Identity:** two hills joined by an arch bridge with a sand "traveller" point (`LogoMark`); the intro animation ends by turning the bridge into this mark.
- **Components:** `btn-primary/secondary/ghost`, `chip` (toggle with `aria-pressed`), `input`, `label`, `card`, `eyebrow`, `h1/h2`; `JourneyIndicator`, `VerificationBadge`, `EvidenceBadge`, `ModeBadge`, `Sources`, `ProfileReview`, `Readiness` (ring, gap table, pathway).
- **Accessibility:** skip link, visible focus ring, labelled controls, `aria-current="step"` on the journey, `role="meter"` and labelled ring for scores, `aria-live` for chat and status, reduced-motion handling, logical properties (`ps`, `ms`, `start`, `end`) so RTL mirrors correctly.

## 6. Testing and validation plan

| Layer | What | How | Result (2026-10-09) |
|---|---|---|---|
| Unit | Eligibility, cost, ranking, priorities, scholarships, gap, learning priority, pathway, profile merge, completeness, admin tokens | Vitest, `npm test` | 52/52 pass |
| AI guards | Quote check, invented average removed, Arabic digits, dedupe, fallback on failure | Vitest with mocked model | Included above, pass |
| End to end | Form path (desktop) and chat path (mobile), explain, save and compare, dashboard, employer publish with course, intro, Arabic RTL, reduced motion, consent, evidence raising readiness, course not raising it, import blocked without admin, admin login, record edit and revert, AI log | `node scripts/e2e.mjs` (Playwright) | 50/50 pass, no unexpected browser errors (offline AI mode) |
| Data | Every seed row validated by Zod at load; counts on /data | Automatic | 113 rows, 0 rejected |
| Live AI | 15 onboarding transcripts, 20 achievements, 10 postings (synthetic) | Run with `ANTHROPIC_API_KEY` set | **Not yet run: no API key in the build environment** |
| Accessibility | Keyboard walk-through, screen reader spot check, contrast | Manual | To do |
| Usability | 5 students, 2 employers, think-aloud | Manual | To do |

## 7. Hackathon MVP scope

In: everything marked Built above, with the curated dataset (11 universities, 44 programs, 13 support programs, 45 courses), three synthetic employers and one synthetic demo student.
Out: student accounts, multi-user admin, file uploads, live LinkedIn import, competitive cut-offs, full national coverage.
Disclosed in the demo: synthetic employers and demo student; AI mode vs offline mode badge; dataset is a subset; fees are tuition only; minimum averages are minimums to apply.

## 8. Roadmap

1. **Weeks 1-4, pilot data:** all public universities' fees and minimums plus unified admission cut-offs, Arabic names, scheduled re-check job that flags stale records (checked_at older than 6 months).
2. **Months 2-3, accounts and evidence:** Supabase auth and Postgres (schema ready), file evidence storage, counsellor view for schools, mentor-reviewed practical assessments.
3. **Months 3-6, partners:** verified employers, verified scholarship providers, Edraak and local training providers' catalogues, LinkedIn partner API.
4. **Months 6-12, public value:** anonymised aggregate gap dashboards for ministries and universities (which skills employers ask for vs what students evidence), with privacy review under the Personal Data Protection Law.
