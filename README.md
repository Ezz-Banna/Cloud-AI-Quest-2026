# Bridgecom

**From where you are to where you could be.** Bridgecom is an AI-assisted platform that connects three transitions for young people in Jordan: school to university (**Discover**), student to opportunity (**Empower**) and learning to employment (**Succeed**). One learner profile grows across all three, and every recommendation shows its reasons and sources.

Built for AI Quest 2026, Sector 02 Smart Society & Public Services (Education & Learning, Accessibility & Inclusion).

## What works today

Every row marked Working was exercised by the automated tests listed under Tests, on a local production build, in offline AI mode.

| Page / feature | Status |
|---|---|
| `/` Landing: intro animation (skippable, reduced motion), three-stage journey, trust principles | Working |
| `/discover` Step-by-step onboarding: 8 steps with progress bar and validation (education level, stream and average, subjects, interests and hobbies, strengths, projects, career dreams, industries, budget, locations, university priorities, accessibility), then a review screen | Working |
| `/discover` Optional chat onboarding: AI turns answers into a profile, student reviews and edits | Working offline. AI path unit-tested with mocked model output; **not yet run against the live API** (no key in the build environment) |
| `/discover/results` Recommendations: rule-based eligibility vs published minimum (year, track, source), fit score with per-factor reasons, tuition estimate, missing-data chips, sources, filters, save | Working |
| "Explain in plain words": AI rewording of the computed reasons; any number or reason not in the facts is rejected and a template is shown | Working offline (template); same AI caveat |
| `/compare` Side-by-side comparison of saved programs (eligibility, fit, cost, missing data, sources) | Working |
| `/dashboard` Profile completeness, top matches, saved programs, skills, opportunities, journey progress, readiness | Working |
| `/empower` Achievements with evidence links, AI skill suggestions with exact quotes, My skills, portfolio, scholarship matching, application pack draft, opt-in sharing | Working (same AI caveat for suggestions). Bridgecom has **no funding partners** and sends nothing |
| `/employer` Demo organisation, role, skills with proficiency and importance, recommended courses, paste-a-posting parsing, publish to the demo store, consenting candidates only | Working. Organisations created here are labelled **Demo organisation**, distinct from verified employers |
| `/succeed` Gap analysis (required level, demonstrated level, evidence, met / needs evidence / below level / missing, learning priority) | Working |
| `/succeed` Course pathway: objective, course, provider, prerequisites, duration (when verified), URL, outcome, practical project; mark complete, attach evidence, progress over time | Working. Completing a course never changes a skill's status |
| `/admin` Password-protected: JSON import with validation report, edit or revert program and course records, provenance review (missing source, stale over 180 days), delete demo roles, AI error log | Working with a single shared `ADMIN_PASSWORD` (signed httpOnly cookie, 8 h). Not multi-user accounts |
| `/data` Coverage counts, real vs synthetic, program table with sources | Working |
| Arabic UI with RTL, mobile layout | Working on all core screens |
| Persistence | Learner profile: browser localStorage. Employer roles, consented snapshots, admin edits and imports, AI log: JSON files in `data/runtime/` on the server. Verified by e2e on one Node process; not suitable for read-only/serverless hosting |
| Student accounts, file uploads, LinkedIn import, real employer verification | Not built (roadmap) |

**Synthetic data, disclosed:** the three employers and their roles, and the demo student "Lina", are invented and labelled in the UI. Universities, programs, fees, minimum averages, scholarships and courses come from public sources collected on 2026-10-09; each record stores its source URL and check date. The dataset is a curated subset (11 universities, 44 programs, 13 support programs, 45 courses), not full national coverage. Missing values are left blank, never estimated.

## Run it

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY for AI mode, ADMIN_PASSWORD for /admin
npm run dev                     # http://localhost:3000
```

Without a key the app runs in **offline mode**: the AI steps use transparent keyword rules and the UI shows an "Offline keyword rules" badge. Set `BRIDGECOM_OFFLINE=1` to force this during a demo if the network is unreliable. Without `ADMIN_PASSWORD` the admin area and data import are disabled (HTTP 503).

Production: `npm run build && npm start`. Deploy to a Node host with a writable disk (or move the repository layer to Postgres, see `db/schema.sql`). Delete `data/runtime/*.json` to reset demo data.

## Tests

```bash
npm test                        # 35 unit tests: engines, offline rules, AI output guards, completeness, admin tokens
npm run build
ADMIN_PASSWORD=test-admin npm start &    # the e2e script logs in with this password
node scripts/e2e.mjs http://localhost:3000 ./e2e-screens   # 40 browser checks, desktop + mobile
```

Last run (2026-10-09): 35/35 unit tests and 40/40 end-to-end checks passed, no unexpected browser console errors, in offline AI mode. `npx tsc --noEmit` and `npm run lint` are clean.

## Architecture

```
Browser (Next.js React, profile in localStorage)
   │  JSON over /api/*
Next.js route handlers (Node)
   ├─ Deterministic engines (src/lib/engines)  eligibility · fit score · cost · scholarships · gap · pathway
   ├─ AI modules (src/lib/ai)                  profile · skills · job parsing · explanation → Zod-validated → guards → offline fallback
   │     └─ Anthropic SDK, claude-opus-5-5, structured outputs, timeout + 1 retry
   └─ Repository (src/lib/data/repo.ts)        data/verified/*.json (sourced) + data/synthetic + data/runtime
```

The language model only interprets and phrases language. Admission eligibility, tuition, funding status, skill status and readiness are computed by rules from sourced records; course completion never counts as proof of a skill.

- Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Zod, Anthropic TypeScript SDK, Vitest, Playwright.
- Docs: `docs/01-architecture-and-priorities.md`, `docs/02-product-spec.md` (PRD, journeys, IA, design system, test plan, MVP scope, roadmap), `docs/03-ai-modules.md`, `db/schema.sql`.
- Data schema for seed and import files: `data/verified/SCHEMA.md`.

## Environment variables

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables AI mode (server-side only, never sent to the browser) |
| `BRIDGECOM_MODEL` | Override the model id (default `claude-opus-5-5`) |
| `BRIDGECOM_OFFLINE` | `1` forces offline rules |
| `ADMIN_PASSWORD` | Enables `/admin` and data import; unset means disabled |

## Privacy

The learner profile is stored in the browser. Nothing reaches employers unless the learner switches on sharing, and then only first name, skills, levels and evidence status (no grades, city, budget or accessibility needs). Switching off deletes the server snapshot.
