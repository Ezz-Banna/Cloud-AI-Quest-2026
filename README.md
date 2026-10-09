# Bridgecom

**From where you are to where you could be.** Bridgecom is an AI-assisted platform that connects three transitions for young people in Jordan: school to university (**Discover**), student to opportunity (**Empower**) and learning to employment (**Succeed**). One learner profile grows across all three, and every recommendation shows its reasons and sources.

Built for AI Quest 2026, Sector 02 Smart Society & Public Services (Education & Learning, Accessibility & Inclusion).

## What works today

| Feature | Status |
|---|---|
| Intro animation (skippable, reduced-motion aware), three-stage journey indicator | Working |
| Conversational onboarding (EN/AR) → AI-structured profile → student review | Working. AI path implemented and unit-tested with mocked model output; **not yet run against the live API** (no key in the build environment). Offline keyword rules tested end to end. |
| Rule-based admission check against published minimum averages (with year, track and source) | Working |
| Program fit score with reasons, tuition estimate from sourced fees, filters | Working |
| Achievement → AI skill suggestions with exact quotes (unsupported ones dropped) → accept/reject | Working (same AI caveat) |
| Scholarship and support matching, application pack draft | Working. Bridgecom has **no funding partners**; it sends nothing. |
| Job posting → structured requirements | Working (same AI caveat) |
| Skills gap, prerequisite-ordered pathway, practical task per skill, course tracking, re-evaluation | Working |
| Opt-in sharing; employer view of consenting candidates | Working |
| Arabic UI with RTL, mobile layout | Working on all core screens |
| JSON data import with validation | Working |
| Accounts, file uploads, LinkedIn import | Not built (roadmap) |

**Synthetic data, disclosed:** the three employers and their roles, and the demo student "Lina", are invented and labelled in the UI. Universities, programs, fees, minimum averages, scholarships and courses come from public sources collected on 2026-10-09; each record stores its source URL and check date. The dataset is a curated subset (11 universities, 44 programs, 13 support programs, 45 courses), not full national coverage. Missing values are left blank, never estimated.

## Run it

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY for AI mode (optional)
npm run dev                     # http://localhost:3000
```

Without a key the app runs in **offline mode**: the AI steps use transparent keyword rules and the UI shows an "Offline keyword rules" badge. Set `BRIDGECOM_OFFLINE=1` to force this during a demo if the network is unreliable.

Production: `npm run build && npm start`. The app writes consented candidate snapshots and employer-created roles to `data/runtime/` on the server, so deploy to a Node host with a writable disk (or move the repository layer to Postgres, see `db/schema.sql`).

## Tests

```bash
npm test                        # 25 unit tests: engines, offline rules, AI output guards
npm run build && npm start &    # then, in another terminal:
node scripts/e2e.mjs http://localhost:3000 ./e2e-screens   # 29 browser checks, desktop + mobile
```

Last run (2026-10-09): 25/25 unit tests and 29/29 end-to-end checks passed, no browser console errors, in offline AI mode.

## Architecture

```
Browser (Next.js React, profile in localStorage)
   │  JSON over /api/*
Next.js route handlers (Node)
   ├─ Deterministic engines (src/lib/engines)  eligibility · fit score · cost · scholarships · gap · pathway
   ├─ AI modules (src/lib/ai)                  profile · skills · job parsing → Zod-validated → guards → offline fallback
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

## Privacy

The learner profile is stored in the browser. Nothing reaches employers unless the learner switches on sharing, and then only first name, skills, levels and evidence status (no grades, city, budget or accessibility needs). Switching off deletes the server snapshot.
