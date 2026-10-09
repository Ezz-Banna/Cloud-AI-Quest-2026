# Bridgecom

**Your next step, clearer.** («خطوتك الجايّة أوضح.») Education and skills guidance for students in Jordan.

Bridgecom helps students, graduates and anyone without one-to-one guidance with three decisions: which university program to consider (Discover), how to describe the experience they already have as skills (Empower), and what a role still asks of them (Succeed). Every result shows where it came from, the person can correct what the system read, and nothing is presented as an admission chance, a readiness percentage or a hiring prediction.

Built for AI Quest 2026, Sector 02 Smart Society & Public Services. Live demo: https://bridgecom.onrender.com (free plan: sleeps when idle, demo data resets on restart).

## What is real, simulated and planned

| Capability | Status |
|---|---|
| Program eligibility (published minimums), cost, fit and information coverage from sourced records | Live |
| Reading job postings and experience descriptions with keyword rules, English and Arabic, every item tied to an exact quote | Live |
| Reading with an AI model (Claude) whose output is checked against the rules | Implemented; **off** on the live site until `ANTHROPIC_API_KEY` is set; not yet run against the live API |
| Editable requirement review before any comparison; comparison as counts plus one next step; ordered practice plan | Live |
| Evidence states: Self-reported, Evidence attached, Awaiting review, Reviewed against a stated rubric, Needs clarification | Live |
| Human review of submitted work | **Simulated reviewers**: Bridgecom team members via `/admin`; see `docs/governance.md` |
| Employers, roles, demo student "Lina" | **Synthetic**, labelled in the UI |
| Per-role sharing with employers (off by default, revocable) | Live |
| Accounts, reviewer roles, partner reviewers, employer verification, database | Planned |

Full report with the issue register, test matrix, scorecard and risks: `docs/06-competition-readiness.md`.

## Run it

Requirements: Node.js 20+ (22 recommended) and npm.

```bash
npm ci
cp .env.example .env.local        # optional: ADMIN_PASSWORD for /admin, ANTHROPIC_API_KEY for AI mode
npm run dev                       # http://localhost:3000
```

Without a key everything runs on keyword rules and the interface says so before and after each analysis. Production: `npm run build && npm start`.

## Environment variables

| Name | Purpose | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Enables AI reading (server-side only; never sent to the browser or returned by any endpoint) | unset = keyword rules |
| `BRIDGECOM_MODEL` | Model id | `claude-opus-5-5` |
| `BRIDGECOM_OFFLINE` | `1` forces keyword rules even with a key | unset |
| `AI_DAILY_CALL_LIMIT` | Max AI API calls per UTC day per process | 2000 |
| `ADMIN_PASSWORD` | Enables `/admin` (data management and work reviews) | unset = admin disabled |
| `BRIDGECOM_STORE_PATH` | Location of the runtime JSON store (tests use a temp file) | `data/runtime/store.json` |

Set secrets in the host's environment settings (Render › Environment). Never commit them or paste them into chat.

## Architecture

```
Browser (Next.js/React; profile and progress in localStorage)
  │  JSON over /api/* (only the fields each endpoint needs)
Middleware: request id, rate limits, body-size caps, admin origin check, security headers
Route handlers (Node)
  ├─ Engines (src/lib/engines)   requirements reader · role comparison and practice plan · eligibility, fit, cost · scholarships
  ├─ AI modules (src/lib/ai)     Zod-validated structured output → quote checks → rule cross-check → keyword fallback
  ├─ Tokens (src/lib/tokens)     random bearer tokens, stored hashed, constant-time compare
  └─ Repository (src/lib/data)   data/verified (sourced) + data/synthetic + data/runtime/store.json (atomic writes)
```

Key rules: the language model only reads and phrases; eligibility, costs, evidence states and comparisons are computed by deterministic rules. A comparison receives only skill ids, levels, evidence states and completed course ids. A finished course never records a skill. An id is never a credential: reading or changing a share or a review request needs its token.

Endpoints: `/api/readiness` (comparison), `/api/ai/job`, `/api/candidates` (per-role shares), `/api/reviews` and `/api/admin/reviews`, `/api/roles`, `/api/match/*`, `/api/status`, `/api/health`.

## Data provenance

Universities, programs, fees, minimum averages, scholarships and courses come from public sources collected and re-checked on 2026-10-09; each record stores its source URL and check date, and missing values are left blank, never estimated (26 universities in the directory, 49 programs at 8 of them, 22 support programs, 45 courses). Fees are from 2024/2025 or undated documents and are labelled with their year. The data accuracy audit, source registry, coverage counts and test report are in `docs/09-data-accuracy-audit.md`; `npm run validate:data` and `npm run audit:data` re-run the checks. A check date means the page was read that day, not that the current cycle is open. Employers, roles and the demo student are synthetic. No real personal data is used. Schema: `data/verified/SCHEMA.md`.

## Tests

```bash
npm run typecheck && npm run lint
npm test                                   # 118 tests incl. job-reading fixtures, held-out measurement, invariants, access control
npm run build
ADMIN_PASSWORD=test-admin BRIDGECOM_STORE_PATH=/tmp/bc-store.json npm start &
node scripts/e2e.mjs http://localhost:3000 ./e2e-screens   # 75 browser checks, desktop and mobile
node scripts/a11y.mjs http://localhost:3000                # axe-core WCAG 2.1 A/AA, EN/AR, 390/640/1366 px
node scripts/smoke.mjs https://bridgecom.onrender.com      # 6 read-only GETs; safe for the public demo
```

Results from the last run are in `docs/06-competition-readiness.md`; machine-readable outputs in `tests/results/`. Do not point the e2e or a11y scripts at the public site: they create data. CI (`.github/workflows/ci.yml`) runs type check, lint, tests, build, a dependency audit of shipped packages and a secret scan on every push.

## Deploy, roll back and recover

- Deploy: push to `main`; Render builds with `npm ci && npm run build` and checks `/api/health` (`render.yaml`).
- Verify: `node scripts/smoke.mjs https://bridgecom.onrender.com`; `/api/health` reports the commit in `build`.
- Roll back: Render › Deploys › pick the last good deploy › Rollback, or `git revert` the bad commit and push.
- Backup and restore: the only server state is `data/runtime/*.json` (demo roles, shares, review requests, admin data edits). Copy the folder to back it up and copy it back to restore. On Render's free plan it is reset on every restart; for anything beyond a demo, move the repository layer to Postgres (`db/schema.sql`).
- If the site is down during a demo: run locally with `BRIDGECOM_OFFLINE=1 npm start`.

## Known limitations

- No user accounts; one shared admin password; admin sessions and rate limits live in memory on one process.
- AI mode is untested against the live API. Held-out job-reading recall is 0.767 (unclear items are sent to the person to confirm).
- No usability study yet; no screen-reader run; Arabic copy not reviewed by a native editor.
- The rate limiter trusts the first `X-Forwarded-For` hop; CSP allows inline scripts (documented in `next.config.ts`).

## Privacy

The learner profile stays in the browser. Nothing is shared unless the person shares with one specific role; then only skills, levels, evidence states and completed course ids (plus your first name, if you gave one), and they can withdraw it. A review request sends only that skill's links and quotes and is deleted 30 days after a decision.

## Docs

`docs/06-competition-readiness.md` (this build's report), `docs/07-statistics-sources.md` (statistics register), `docs/09-data-accuracy-audit.md` (data accuracy audit, sources, coverage, tests), `docs/governance.md` (review workflow), `docs/04-fit-engine.md`, `docs/03-ai-modules.md`, `docs/01-architecture-and-priorities.md`, `docs/02-product-spec.md`. `docs/05-audit-and-readiness.md` describes the earlier build (readiness percentages) and is kept for history.
