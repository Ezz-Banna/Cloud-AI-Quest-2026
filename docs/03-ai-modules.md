# Bridgecom AI module specifications

Principle: the language model reads and writes language. Rules decide facts. Every LLM output passes a deterministic validator before it reaches the user, and every module has an offline fallback so the product keeps working without the AI service.

Model: `claude-opus-5-5` via the official Anthropic TypeScript SDK, server-side only (`src/lib/ai/client.ts`), effort `low`, structured output validated by Zod (`betaZodOutputFormat`), server-side refusal fallback enabled, 20 s timeout, SDK retries off, one retry of our own (worst case about 40 s). Model id is configurable with `BRIDGECOM_MODEL`. `BRIDGECOM_OFFLINE=1` forces the fallback for demos.

Cost reference (list prices at the time of writing: $4 per million input tokens, $20 per million output tokens). A typical call is about 1,000-1,500 input and 300-700 output tokens, so roughly $0.01-0.02 per call and under $0.10 for a full student journey (about four calls). Modules 2, 3, 5, 7, 8, 9 and 10 make no model calls and cost nothing per use. A cheaper model (for example Haiku 5.5) can be set through `BRIDGECOM_MODEL` if the team chooses to trade quality for cost; that has not been evaluated.

| # | Module | Uses LLM | Code |
|---|---|---|---|
| 1 | Student profile intelligence | Yes | `interpretProfile` in `src/lib/ai/modules.ts` |
| 2 | Verified program retrieval | No | `src/lib/data/repo.ts` |
| 3 | Transparent program matching | No | `src/lib/engines/programs.ts` |
| 4 | Achievement and skill extraction | Yes | `extractSkills` |
| 5 | Scholarship and opportunity matching | No | `src/lib/engines/scholarships.ts` |
| 6 | Employer requirement parsing | Yes | `parseJob` |
| 7 | Skills-gap assessment | No | `assessRole` in `src/lib/engines/gap.ts` |
| 8 | Personalised pathway generation | No | `buildPathway` |
| 9 | Explainable recommendations | No (reason codes rendered in EN/AR) | engines return `reasons[]` |
| 10 | Progress insights | No | readiness history in `Readiness.tsx` |

---

## 1. Student profile intelligence
- **Input:** onboarding answers `{q, a}[]` (English or Arabic, chips plus free text).
- **Output:** `ProfileDraft`: average, stream, interests (fixed field ids), careers, career tags, budget, financial need, cities (fixed list), relocation, university type, accessibility needs, strengths, up to 3 clarification questions.
- **Prompt:** system prompt in `modules.ts` ("only record what the student said, never guess an average or budget, you are not deciding eligibility").
- **Validation:** Zod schema with enums; average must be 0-100 and must literally appear in the answers (Arabic digits normalised), else set to null; negative budgets removed; the student reviews and edits every field before it is used.
- **Failure states:** no key, timeout, refusal, invalid structure. All fall back to `fallbackProfile` (keyword and number rules), and the UI shows "Offline keyword rules".
- **Evaluation:** `tests/ai-modules.test.ts` (guards with mocked model output), `tests/fallback.test.ts`. Live evaluation set to run once a key is configured: 15 synthetic onboarding transcripts (8 English, 7 Arabic) scored on field-level exact match and on "no invented values".

## 2. Verified program retrieval
- Reads `data/verified/*.json` plus imported rows, validates each row with Zod, de-duplicates by id. Records carry `sources[]`, `checked_at`, `verification`.
- **Failure:** invalid rows are rejected and counted on the About the data page.

## 3. Transparent program matching
- **Eligibility (hard rule):** compares the student's average with the program's `min_admission_avg` (currently the minimum to apply, with year and track) and stream list. Outcomes: meets, below, stream mismatch, minimum not verified, average missing. Never estimated, never decided by the LLM.
- **Fit score (0-100):** interest match 35, career match 25, budget +15/−20, preferred city +10/−10, university type ±5, sourced internship +5, unverified data −3. Every point comes with an EN/AR reason.
- **Cost:** credit hours × fee per hour from the same sourced record, tuition only, shown with its basis; null if either number is missing.
- **Evaluation:** unit tests in `tests/engines.test.ts`.

## 4. Achievement and skill extraction
- **Input:** title, description, links.
- **Output:** skills (fixed taxonomy ids) with level 1-3, an exact supporting quote and a one-line rationale; an optional clearer description using only the student's facts.
- **Validation:** every quote must be found in the student's own text (normalised match) or the skill is dropped, and the UI reports how many were dropped. Accepted skills are `self-reported`, or `evidence-attached` if the student gave a link. Nothing is ever marked verified.
- **Fallback:** keyword match against the taxonomy at level 1 with the containing sentence as the quote.
- **Evaluation:** 20 synthetic achievements with gold skills; measure precision (no unsupported skills is the priority) and recall.

## 5. Scholarship and opportunity matching
- Rules on stage, minimum average, financial need and field lists. Outcomes: likely relevant, check eligibility, not eligible. Published eligibility text and the official link are always shown. A match never implies funding.
- The "application pack" builds a draft from the student's own profile. Bridgecom sends nothing and has no funding partners; the UI says so.

## 6. Employer requirement parsing
- **Input:** posting text. **Output:** title, requirements (skill id, level, mandatory, quote), unmapped requirements.
- **Validation:** quotes must appear in the posting; duplicates are merged keeping the strictest; non-job-related criteria are excluded by instruction; the employer reviews and edits before publishing.
- **Fallback:** line-by-line keyword rules ("preferred", "plus" or "nice to have" means not mandatory).

## 7. Skills-gap assessment
- Status per requirement: met (level reached and evidence attached or better), needs evidence (level reached but self-reported only), below level, missing. Readiness = 80% mandatory + 20% preferred; needs-evidence counts 0.5, below-level counts in proportion to the level reached × 0.5.
- **Rule:** completing a course is recorded but never changes status. Tested.

## 8. Personalised pathway generation
- Collects unmet skills plus missing prerequisites (transitively), orders them topologically (Kahn's algorithm) with mandatory first, then ranks courses per skill: free, the student's language, has a project, level fit, verified source. Each step pairs a course with a practical task from the taxonomy.

## 9. Explainable recommendations
- Engines emit reason codes with weights and EN/AR text; the UI renders them as "+/−" lines next to sources. No generated prose is shown as a reason, so every explanation is traceable to a rule.

## 10. Progress insights
- Readiness snapshots per role are stored on the device; the UI shows "Progress: X% → Y% since date". With a database these go to `readiness_snapshots`.

## Responsible AI notes (Jordan context)
- Personal data stays on the device by default; sharing with employers is opt-in, revocable, and limited to skills (no grades, city, budget or accessibility needs). This follows the data minimisation and consent principles of Jordan's Personal Data Protection Law No. 24 of 2023; legal review is still needed before launch.
- The AI is never the authority on admission, tuition, funding, certification or hiring suitability.
- No AI output is logged with raw personal text; the planned `ai_requests` table stores only metadata.
