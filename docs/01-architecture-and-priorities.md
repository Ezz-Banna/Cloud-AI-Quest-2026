# Bridgecom: product architecture, feature priorities and build sequence

Status: v2, 2026-10-09 (functional website: form onboarding, dashboard, compare, employer portal, admin). Sector 02 Smart Society & Public Services (pending user confirmation).

## 1. One platform, one profile

Bridgecom is one web app around a single **Learner Profile** that grows across three stages. Each stage reads what the earlier stages wrote, so the story in the demo is one person moving forward, not three tools.

```
                    ┌──────────────────── Learner Profile (one identity) ───────────────────┐
                    │ academics (Tawjihi avg, stream) · interests · ambitions · budget ·     │
                    │ city · accessibility needs · skills[] (each with evidence + status) ·  │
                    │ achievements[] · learning progress · consent settings                  │
                    └───────▲──────────────────────▲──────────────────────────▲──────────────┘
                            │                      │                          │
   DISCOVER (Student→University)    EMPOWER (Student→Opportunity)    SUCCEED (Student→Employment)
   conversational onboarding        achievements & evidence          employer roles & requirements
   eligibility check (rules)        AI skill extraction (no invention) skills-gap analysis
   program ranking + "why"          scholarship matching + "why"      sequenced course pathway
   cost estimate from verified fees funding workflow (unverified label) progress + re-evaluation
```

### Trust layers (shown in the UI on every record)
| Badge | Meaning |
|---|---|
| **Verified** | Every key field came from an official source page; source URL and date checked are stored. |
| **Partial** | Some fields sourced, others missing (shown as "not yet verified", never estimated). |
| **Synthetic** | Made-up demo data (sample employers, sample students). Always labelled. |
| **Self-reported** | A user claim with no evidence attached. |
| **Evidence attached** | User added a link or file; not checked by Bridgecom. |

Bridgecom never upgrades a claim to "verified" on its own. Formal eligibility, tuition and funding status come only from stored records, never from the LLM.

## 2. Stack decision (D-B01)

| Choice | Why |
|---|---|
| **Next.js 15 (App Router) + TypeScript + Tailwind 4** | One language front and back, API routes keep the AI key server-side, installs and runs in this environment (verified). |
| **Seed JSON + repository layer** for the MVP; **Postgres schema** (`db/schema.sql`, Supabase-ready) for scale | No external DB to provision before the demo; the repository interface is the only thing that changes when moving to Postgres. |
| **Profile stored on the user's device** (localStorage) unless they opt in to share with employers | Privacy by default, no accounts needed for the demo, no personal data on the server. Opt-in sharing writes a consented snapshot to the server store. |
| **Claude API** (`claude-opus-5-5`, low effort, structured JSON output via Zod) behind an adapter | Used only for language understanding: reading free-text answers, extracting skills from achievements, parsing job descriptions, writing explanations. Each call has a deterministic fallback so the demo works offline and is labelled as such. |
| **Vitest** | Fast unit tests for the deterministic engines. |
| **i18n**: English + Arabic dictionary, `dir="rtl"` switch | RTL layout support from day one; Arabic copy for all core UI strings. |

Network note: the build container can reach npm and the Anthropic API only, so university data is collected through a separate research pass with cited sources (see `data/verified/`).

## 3. Prioritised features

**Must (demo journey, built first)**
1. Intro animation (skippable, reduced-motion aware) and the three-stage journey indicator.
2. Discover: conversational onboarding (chips + free text), AI turns answers into a structured profile, user confirms it.
3. Discover: deterministic eligibility check + program ranking with per-factor explanation, cost estimate, source and date for every fact.
4. Empower: add achievements/projects/links; AI proposes skills with the exact quote that supports each one; user accepts or rejects; nothing is auto-certified.
5. Empower: scholarship/opportunity matching with reasons and verification badge.
6. Succeed: employer role with mandatory/preferred skills and levels (one synthetic employer seeded, plus "paste a job description" parsed by AI).
7. Succeed: gap analysis (missing / insufficient evidence / met), course pathway ordered by prerequisites, suggested practical project per skill, progress tracking and re-evaluation.
8. Data-trust badges everywhere; "About the data" page listing sources and coverage honestly.

**Should**
- Employer dashboard showing only consenting candidates, with job-related criteria only.
- Arabic UI toggle with RTL; accessible forms; mobile layout.
- Sample-data import (JSON upload) for universities/programs/courses with validation report.

**Could / later (roadmap)**
- Accounts and Supabase auth, LinkedIn import via official OAuth, evidence-file storage, verified-issuer credentials (e.g. Open Badges), employer verification, full national program coverage with scheduled re-checks, sponsorship marketplace with verified partners.

**Won't in MVP**: real payments or funding, automated admission decisions, employer ranking of non-consenting people, scraping LinkedIn.

## 4. AI modules (summary; full spec in `docs/03-ai-modules.md`)

| # | Module | Method | LLM role | Deterministic guard |
|---|---|---|---|---|
| 1 | Student profile intelligence | LLM structured extraction from onboarding answers | Interpret free text into fields | Zod schema; numeric ranges; user confirms before use |
| 2 | Verified program retrieval | Filter over verified records | none | Only stored records with sources |
| 3 | Program matching | Weighted scoring (interest fit, career fit, budget, location, quality signals, accessibility) | Optional plain-language summary of the computed reasons | Eligibility is a hard rule check vs. published minimums; LLM never decides it |
| 4 | Achievement & skill extraction | LLM extraction with required supporting quote | Propose skills + level + quote | Quote must appear in the user's text, else dropped; status stays "self-reported/evidence attached" |
| 5 | Scholarship matching | Rule match on criteria + score | none | Unverified programs labelled; no promise of funding |
| 6 | Employer requirement parsing | LLM extraction from job text | Map to skill ids + levels | Skill ids must exist in taxonomy; employer reviews before publish |
| 7 | Skills-gap assessment | Deterministic compare of required level vs. evidenced level | none | Course completion never counts as proof; evidence needed |
| 8 | Pathway generation | Topological sort by prerequisites + ranking (free, language, practical project) | none | Only catalogued courses |
| 9 | Explainable recommendations | Reason codes from engines, rendered as text (template, optional LLM polish) | Wording only | Every sentence maps to a reason code |
| 10 | Progress insights | Readiness % from gap engine over time | none | Recomputed from evidence |

## 5. Build sequence (fastest reliable path)

1. **Skeleton** (done in the first hour): Next.js app, design tokens, layout, journey indicator, data loaders, schema types.
2. **Engines + tests**: eligibility, program scoring, scholarship match, gap analysis, pathway sort. Pure functions, unit-tested.
3. **AI adapter**: Claude client with timeout, 1 retry, Zod-validated output, offline fallback; 4 endpoints (`/api/ai/profile`, `/api/ai/skills`, `/api/ai/job`, `/api/ai/explain`).
4. **Screens in demo order**: Intro → Discover onboarding → Results → Empower profile → Opportunities → Succeed role picker → Gap + pathway → Progress.
5. **Verified data drop-in**: research pass fills `data/verified/*.json`; app shows coverage counts and badges automatically.
6. **Polish**: Arabic/RTL, accessibility pass, empty/loading/error states, mobile.
7. **Harden**: end-to-end run through the journey with and without the API key; README; disclosure table.
8. **Docs**: PRD, journeys, IA, schema, AI specs, test plan, roadmap (written from the working build, not ahead of it).
